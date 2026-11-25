"""Campus feature services. All writes run in the caller's single transaction."""
import json
from datetime import date
from .identity import DomainError
from .db import now

def rows(db, sql, args=()):
    return [dict(r) for r in db.execute(sql,args)]
def one(db, sql, args=()):
    r=db.execute(sql,args).fetchone()
    if not r: raise DomainError('Record not found',404)
    return dict(r)
def role(user,*roles):
    if user.role not in roles: raise DomainError('Permission denied',403)
def text(value,limit=1000):
    if not isinstance(value,str) or not value.strip() or len(value.strip())>limit:
        raise DomainError('Invalid text field')
    return value.strip()
def integer(value,minimum=1,maximum=100000000):
    if isinstance(value,bool) or not isinstance(value,(int,str)) or isinstance(value,str) and not value.isdecimal():
        raise DomainError('Invalid integer')
    n=int(value)
    if not minimum<=n<=maximum: raise DomainError('Integer outside allowed range')
    return n
def event(bus,db,user,action,entity,recipients,message):
    bus.publish(db,dict(actor=user.id,action=action,entity=entity,recipients=recipients,message=message))
def require_member(courses,db,user,cid):
    if user.role=='student': courses.require_student(db,user,cid)
    else: courses.require_lecturer(db,user,cid)

class RegistrationService:
    """Eligibility constraints and serialized seat allocation."""
    def __init__(self,courses,bus): self.courses,self.bus=courses,bus
    def catalogue(self,db,user):
        role(user,'student','admin')
        return rows(db,"""SELECT c.id,c.code,c.title,u.name AS lecturer,o.*,
           (SELECT COUNT(*) FROM enrollments e WHERE e.course_id=c.id) AS occupied
           FROM courses c JOIN offerings o ON o.course_id=c.id JOIN users u ON u.id=c.lecturer_id
           WHERE o.semester='Fall 2026' ORDER BY c.code""")
    def register(self,db,user,cid):
        role(user,'student')
        return self.allocate(db,user,user.id,cid)
    def admin_enroll(self,db,user,cid,sid):
        role(user,'admin')
        one(db,"SELECT id FROM users WHERE id=? AND role='student'",(sid,))
        return self.allocate(db,user,sid,cid)
    def allocate(self,db,user,sid,cid):
        o=one(db,"SELECT * FROM offerings WHERE course_id=? AND semester='Fall 2026'",(cid,))
        if db.execute("SELECT 1 FROM enrollments WHERE course_id=? AND student_id=?",(cid,sid)).fetchone():
            raise DomainError('Already enrolled',409)
        if db.execute("SELECT 1 FROM course_results WHERE course_id=? AND student_id=? AND percentage>=60",(cid,sid)).fetchone():
            raise DomainError('Course already passed',409)
        if db.execute("SELECT COUNT(*) FROM enrollments WHERE course_id=?",(cid,)).fetchone()[0]>=o['capacity']:
            raise DomainError('No available seats',409)
        missing=db.execute("""SELECT 1 FROM prerequisites p WHERE p.course_id=? AND NOT EXISTS
            (SELECT 1 FROM course_results r WHERE r.course_id=p.required_course_id AND r.student_id=? AND r.percentage>=60)""",(cid,sid)).fetchone()
        if missing: raise DomainError('Prerequisite not completed',409)
        clash=db.execute("""SELECT 1 FROM enrollments e JOIN offerings x ON x.course_id=e.course_id
            WHERE e.student_id=? AND x.semester=? AND x.weekday=? AND x.start_min<? AND x.end_min>?""",
            (sid,o['semester'],o['weekday'],o['end_min'],o['start_min'])).fetchone()
        if clash: raise DomainError('Timetable conflict',409)
        credits=db.execute("""SELECT COALESCE(SUM(o.credits),0) FROM enrollments e JOIN offerings o ON o.course_id=e.course_id
            WHERE e.student_id=? AND o.semester=?""",(sid,o['semester'])).fetchone()[0]
        if credits+o['credits']>18: raise DomainError('18-credit limit exceeded',409)
        db.execute("INSERT INTO enrollments VALUES (?,?)",(cid,sid))
        event(self.bus,db,user,'registered',cid,[sid],'Course registration confirmed')
    def timetable(self,db,user):
        role(user,'student','lecturer')
        where="e.student_id=?" if user.role=='student' else "c.lecturer_id=?"
        join="JOIN enrollments e ON e.course_id=c.id" if user.role=='student' else ""
        return rows(db,f"""SELECT c.id,c.code,c.title,o.weekday,o.start_min,o.end_min,o.room,o.credits,o.semester
            FROM courses c JOIN offerings o ON o.course_id=c.id {join} WHERE {where} ORDER BY o.weekday,o.start_min""",(user.id,))

class AcademicRecordsService:
    """Course results are lecturer-released; GPA is derived, never client-supplied."""
    def __init__(self,courses,bus): self.courses,self.bus=courses,bus
    def release(self,db,user,cid,sid):
        self.courses.require_lecturer(db,user,cid)
        if not db.execute("SELECT 1 FROM enrollments WHERE course_id=? AND student_id=?",(cid,sid)).fetchone():
            raise DomainError('Student not enrolled',403)
        if db.execute("SELECT 1 FROM course_results WHERE course_id=? AND student_id=?",(cid,sid)).fetchone():
            raise DomainError('Course result already released',409)
        marks=one(db,"""SELECT COUNT(a.id) AS total,COUNT(f.submission_id) AS graded,
            COALESCE(SUM(f.score),0) AS earned,COALESCE(SUM(a.max_points),0) AS possible
            FROM assignments a LEFT JOIN submissions s ON s.assignment_id=a.id AND s.student_id=?
            LEFT JOIN feedback f ON f.submission_id=s.id WHERE a.course_id=?""",(sid,cid))
        if not marks['total'] or marks['graded']!=marks['total']: raise DomainError('All published assignments must be graded before releasing result',409)
        credits=one(db,"SELECT credits FROM offerings WHERE course_id=?",(cid,))['credits']
        pct=round(100*marks['earned']/marks['possible'],2)
        db.execute("INSERT INTO course_results VALUES (?,?,?,?,?)",(sid,cid,pct,credits,now()))
        event(self.bus,db,user,'result_released',cid,[sid],'Course result released')
    @staticmethod
    def letter(pct):
        for threshold,letter,points in [(93,'A',4),(90,'A-',3.7),(87,'B+',3.3),(83,'B',3),(80,'B-',2.7),(77,'C+',2.3),(73,'C',2),(70,'C-',1.7),(60,'D',1)]:
            if pct>=threshold:return letter,points
        return 'F',0
    def record(self,db,sid):
        result=rows(db,"""SELECT c.id AS course_id,c.code,c.title,r.percentage,r.credits,r.released_at
            FROM course_results r JOIN courses c ON c.id=r.course_id WHERE r.student_id=? ORDER BY r.released_at DESC""",(sid,))
        for r in result:r['letter'],r['grade_points']=self.letter(r['percentage'])
        credits=sum(r['credits'] for r in result)
        gpa=round(sum(r['grade_points']*r['credits'] for r in result)/credits,2) if credits else None
        return dict(results=result,gpa=gpa,attempted_credits=credits,earned_credits=sum(r['credits'] for r in result if r['percentage']>=60),
                    programme=rows(db,"SELECT p.name,p.department FROM programmes p JOIN student_programmes s ON s.programme_id=p.id WHERE s.student_id=?",(sid,)))

class AttendanceService:
    def __init__(self,courses,bus):self.courses,self.bus=courses,bus
    def create(self,db,user,cid,day,title):
        self.courses.require_lecturer(db,user,cid)
        try: date.fromisoformat(day)
        except (ValueError,TypeError): raise DomainError('Invalid date')
        title=text(title,120)
        if db.execute("SELECT 1 FROM attendance_sessions WHERE course_id=? AND session_date=? AND title=?",(cid,day,title)).fetchone():
            raise DomainError('Session already exists',409)
        session=db.execute("INSERT INTO attendance_sessions(course_id,session_date,title) VALUES (?,?,?)",(cid,day,title)).lastrowid
        event(self.bus,db,user,'attendance_session_created',session,[],'Attendance session created')
        return session
    def mark(self,db,user,session,sid,status):
        s=one(db,"SELECT * FROM attendance_sessions WHERE id=?",(session,))
        self.courses.require_lecturer(db,user,s['course_id'])
        if status not in ('present','absent','late','excused'):raise DomainError('Invalid attendance status')
        if not db.execute("SELECT 1 FROM enrollments WHERE course_id=? AND student_id=?",(s['course_id'],sid)).fetchone():
            raise DomainError('Student not enrolled',403)
        db.execute("INSERT INTO attendance VALUES (?,?,?) ON CONFLICT(session_id,student_id) DO UPDATE SET status=excluded.status",(session,sid,status))
        event(self.bus,db,user,'attendance_marked',session,[],'Attendance recorded')
    def student_record(self,db,sid):
        items=rows(db,"""SELECT c.code,s.id AS session_id,s.session_date,s.title,a.status
             FROM attendance a JOIN attendance_sessions s ON s.id=a.session_id JOIN courses c ON c.id=s.course_id
             WHERE a.student_id=? ORDER BY s.session_date DESC""",(sid,))
        count=sum(r['status']!='excused' for r in items)
        return dict(items=items,rate=round(100*sum(r['status'] in ('present','late') for r in items)/count,1) if count else None)
    def roster(self,db,user,cid):
        self.courses.require_lecturer(db,user,cid)
        return rows(db,"SELECT u.id,u.name FROM users u JOIN enrollments e ON u.id=e.student_id WHERE e.course_id=? ORDER BY u.name",(cid,))
    def sessions(self,db,user,cid):
        self.courses.require_lecturer(db,user,cid)
        sessions=rows(db,"SELECT * FROM attendance_sessions WHERE course_id=? ORDER BY session_date DESC",(cid,))
        for s in sessions:s['marks']=rows(db,"SELECT * FROM attendance WHERE session_id=?",(s['id'],))
        return sessions

class FinanceService:
    """Fictional ledger only: amounts are integer fils; no payment network."""
    def __init__(self,bus):self.bus=bus
    def ledger(self,db,user):
        role(user,'student','admin')
        where="WHERE i.student_id=?" if user.role=='student' else ""
        return rows(db,f"""SELECT i.*,u.name AS student_name,p.id AS payment_id,p.recorded_at AS paid_at,
            CASE WHEN p.id IS NULL THEN 'unpaid' ELSE 'paid' END AS status
            FROM invoices i JOIN users u ON u.id=i.student_id LEFT JOIN payments p ON p.invoice_id=i.id {where} ORDER BY i.id""",
            (user.id,) if user.role=='student' else ())
    def pay(self,db,user,iid):
        role(user,'student')
        invoice=one(db,"SELECT * FROM invoices WHERE id=?",(iid,))
        if invoice['student_id']!=user.id:raise DomainError('Invoice not owned by student',403)
        if db.execute("SELECT 1 FROM payments WHERE invoice_id=?",(iid,)).fetchone():raise DomainError('Invoice already settled',409)
        pid=db.execute("INSERT INTO payments(invoice_id,amount_fils,recorded_at) VALUES (?,?,?)",(iid,invoice['amount_fils'],now())).lastrowid
        event(self.bus,db,user,'simulated_payment',pid,[user.id],'Demo invoice settled; no real money moved')
        return pid
    def issue(self,db,user,sid,title,amount,due):
        role(user,'admin')
        one(db,"SELECT id FROM users WHERE id=? AND role='student'",(sid,))
        try:date.fromisoformat(due)
        except (ValueError,TypeError):raise DomainError('Invalid invoice due date')
        iid=db.execute("INSERT INTO invoices(student_id,title,amount_fils,due_date) VALUES (?,?,?,?)",(sid,text(title,150),integer(amount),due)).lastrowid
        event(self.bus,db,user,'invoice_issued',iid,[sid],'New demo invoice issued')
        return iid

class StudentServices:
    transitions={'pending':{'in_review','rejected','cancelled'},'in_review':{'resolved','rejected','cancelled'}}
    def __init__(self,bus):self.bus=bus
    def create(self,db,user,category,subject,description):
        role(user,'student')
        if category not in ('transcript','enrollment_letter','it_support','general'):raise DomainError('Unknown request category')
        rid=db.execute("INSERT INTO service_requests(student_id,category,subject,description,status,created_at,updated_at) VALUES (?,?,?,?,'pending',?,?)",
                       (user.id,category,text(subject,150),text(description,3000),now(),now())).lastrowid
        event(self.bus,db,user,'request_created',rid,[r['id'] for r in rows(db,"SELECT id FROM users WHERE role='admin'")],'New campus service request')
        return rid
    def change(self,db,user,rid,status,note=''):
        r=one(db,"SELECT * FROM service_requests WHERE id=?",(rid,))
        if user.role=='student':
            if r['student_id']!=user.id or status!='cancelled':raise DomainError('Permission denied',403)
        else:
            role(user,'admin')
            if status=='cancelled':raise DomainError('Only owner can cancel',403)
        if status not in self.transitions.get(r['status'],set()):raise DomainError('Illegal request transition',409)
        if status in ('resolved','rejected'): note=text(note,1000)
        db.execute("UPDATE service_requests SET status=?,decision=?,updated_at=? WHERE id=?",(status,note,now(),rid))
        event(self.bus,db,user,'request_'+status,rid,[r['student_id']],'Service request: '+status)
    def list(self,db,user):
        role(user,'student','admin')
        return rows(db,"SELECT r.*,u.name AS student_name FROM service_requests r JOIN users u ON u.id=r.student_id"+(" WHERE r.student_id=?" if user.role=='student' else "")+" ORDER BY r.id DESC",(user.id,) if user.role=='student' else ())

class AdvisingService:
    def __init__(self,records,attendance,bus):self.records,self.attendance,self.bus=records,attendance,bus
    def consent(self,db,user,advisor,enabled):
        role(user,'student')
        one(db,"SELECT * FROM advisor_assignments WHERE student_id=? AND advisor_id=?",(user.id,advisor))
        if enabled not in (0,1):raise DomainError('Invalid consent')
        db.execute("UPDATE advisor_assignments SET consent=? WHERE student_id=? AND advisor_id=?",(enabled,user.id,advisor))
        event(self.bus,db,user,'consent_changed',advisor,[advisor],'Student changed advising consent')
    def require(self,db,user,sid):
        role(user,'advisor')
        if not db.execute("SELECT 1 FROM advisor_assignments WHERE advisor_id=? AND student_id=? AND consent=1",(user.id,sid)).fetchone():
            raise DomainError('Assigned advisor and active consent required',403)
    def note(self,db,user,sid,note):
        self.require(db,user,sid)
        nid=db.execute("INSERT INTO advising_notes(student_id,advisor_id,note,created_at) VALUES (?,?,?,?)",(sid,user.id,text(note,2000),now())).lastrowid
        event(self.bus,db,user,'advising_note',nid,[sid],'New advising note available')
    def students(self,db,user):
        role(user,'advisor')
        items=rows(db,"SELECT u.id,u.name,a.consent FROM advisor_assignments a JOIN users u ON u.id=a.student_id WHERE a.advisor_id=?",(user.id,))
        for item in items:
            if not item['consent']:continue
            sid=item['id']; item['record']=self.records.record(db,sid);item['attendance']=self.attendance.student_record(db,sid)
            item['notes']=rows(db,"SELECT * FROM advising_notes WHERE student_id=? AND advisor_id=? ORDER BY id DESC",(sid,user.id))
            rate=item['attendance']['rate']; gpa=item['record']['gpa']
            item['risk_reasons']=[label for condition,label in [(rate is not None and rate<80,'Attendance below 80%'),(gpa is not None and gpa<2,'GPA below 2.0')] if condition]
        return items
    def student_view(self,db,user):
        role(user,'student')
        return dict(advisors=rows(db,"SELECT u.id,u.name,a.consent FROM advisor_assignments a JOIN users u ON u.id=a.advisor_id WHERE a.student_id=?",(user.id,)),
          notes=rows(db,"SELECT n.*,u.name AS advisor_name FROM advising_notes n JOIN users u ON u.id=n.advisor_id WHERE n.student_id=? ORDER BY n.id DESC",(user.id,)))

class WorkspaceService:
    """Internal course messaging and one-response polls, no external integrations."""
    def __init__(self,courses,bus):self.courses,self.bus=courses,bus
    def message(self,db,user,cid,body):
        require_member(self.courses,db,user,cid)
        mid=db.execute("INSERT INTO course_messages(course_id,author_id,body,created_at) VALUES (?,?,?,?)",(cid,user.id,text(body,2000),now())).lastrowid
        event(self.bus,db,user,'course_message',mid,[],'Course message posted')
    def form(self,db,user,cid,title,question,options):
        self.courses.require_lecturer(db,user,cid)
        if isinstance(options,str):options=[s.strip() for s in options.split('|')]
        if not isinstance(options,list) or not 2<=len(options)<=8:raise DomainError('Provide 2–8 options')
        options=[text(s,100) for s in options]
        if len(set(options))!=len(options):raise DomainError('Options must be distinct')
        fid=db.execute("INSERT INTO course_forms(course_id,title,question,options_json,created_at) VALUES (?,?,?,?,?)",
                       (cid,text(title,150),text(question,500),json.dumps(options),now())).lastrowid
        event(self.bus,db,user,'form_created',fid,[],'Course poll created')
        return fid
    def respond(self,db,user,fid,choice):
        f=one(db,"SELECT * FROM course_forms WHERE id=?",(fid,));self.courses.require_student(db,user,f['course_id'])
        if not f['open']:raise DomainError('Poll closed',409)
        if not 0<=choice<len(json.loads(f['options_json'])):raise DomainError('Invalid option')
        if db.execute("SELECT 1 FROM form_responses WHERE form_id=? AND student_id=?",(fid,user.id)).fetchone():raise DomainError('Already responded',409)
        db.execute("INSERT INTO form_responses VALUES (?,?,?,?)",(fid,user.id,choice,now()))
        event(self.bus,db,user,'form_response',fid,[],'Poll response recorded')
    def close(self,db,user,fid):
        f=one(db,"SELECT * FROM course_forms WHERE id=?",(fid,));self.courses.require_lecturer(db,user,f['course_id'])
        if not f['open']:raise DomainError('Poll already closed',409)
        db.execute("UPDATE course_forms SET open=0 WHERE id=?",(fid,))
        event(self.bus,db,user,'form_closed',fid,[],'Poll closed')
    def read(self,db,user,cid):
        require_member(self.courses,db,user,cid)
        messages=rows(db,"SELECT m.*,u.name AS author_name FROM course_messages m JOIN users u ON u.id=m.author_id WHERE m.course_id=? ORDER BY m.id DESC LIMIT 100",(cid,))
        forms=rows(db,"SELECT * FROM course_forms WHERE course_id=? ORDER BY id DESC",(cid,))
        for f in forms:
            f['options']=json.loads(f.pop('options_json'))
            if user.role=='lecturer':
                f['counts']=[db.execute("SELECT COUNT(*) FROM form_responses WHERE form_id=? AND choice=?",(f['id'],i)).fetchone()[0] for i in range(len(f['options']))]
            else:
                r=db.execute("SELECT choice FROM form_responses WHERE form_id=? AND student_id=?",(f['id'],user.id)).fetchone()
                f['my_choice']=r['choice'] if r else None
        return dict(messages=messages,forms=forms)

class GovernanceService:
    def __init__(self,bus):self.bus=bus
    def overview(self,db,user):
        role(user,'admin')
        return dict(people=rows(db,"SELECT id,username,name,role FROM users ORDER BY role,name"),
          programmes=rows(db,"SELECT * FROM programmes"),courses=rows(db,"SELECT c.*,o.* FROM courses c LEFT JOIN offerings o ON o.course_id=c.id ORDER BY c.code"),
          enrollments=rows(db,"SELECT * FROM enrollments"),advisor_assignments=rows(db,"SELECT * FROM advisor_assignments"),
          audit=rows(db,"SELECT a.*,u.name AS actor_name FROM audit a JOIN users u ON u.id=a.actor_id ORDER BY a.id DESC LIMIT 200"))
    def programme(self,db,user,name,department):
        role(user,'admin'); name=text(name,150)
        if db.execute("SELECT 1 FROM programmes WHERE name=?",(name,)).fetchone():raise DomainError('Programme already exists',409)
        pid=db.execute("INSERT INTO programmes(name,department) VALUES (?,?)",(name,text(department,150))).lastrowid
        event(self.bus,db,user,'programme_created',pid,[],'Programme created')
    def assign_advisor(self,db,user,sid,aid):
        role(user,'admin');one(db,"SELECT id FROM users WHERE id=? AND role='student'",(sid,));one(db,"SELECT id FROM users WHERE id=? AND role='advisor'",(aid,))
        if db.execute("SELECT 1 FROM advisor_assignments WHERE student_id=? AND advisor_id=?",(sid,aid)).fetchone():raise DomainError('Advisor already assigned',409)
        db.execute("INSERT INTO advisor_assignments VALUES (?,?,0)",(sid,aid));event(self.bus,db,user,'advisor_assigned',aid,[sid],'Advisor assigned; consent required')
    def create_course(self,db,user,code,title,lecturer,credits,capacity,day,start,end,room):
        role(user,'admin');one(db,"SELECT id FROM users WHERE id=? AND role='lecturer'",(lecturer,))
        code=text(code,20).upper()
        if db.execute("SELECT 1 FROM courses WHERE code=?",(code,)).fetchone():raise DomainError('Course already exists',409)
        if not 0<=day<=6 or not 0<=start<end<=1440 or not 1<=credits<=6 or not 1<=capacity<=1000:raise DomainError('Invalid offering')
        if db.execute("""SELECT 1 FROM offerings o JOIN courses c ON c.id=o.course_id
           WHERE o.semester='Fall 2026' AND o.weekday=? AND o.start_min<? AND o.end_min>? AND (c.lecturer_id=? OR o.room=?)""",(day,end,start,lecturer,room)).fetchone():
            raise DomainError('Lecturer or room timetable conflict',409)
        cid=db.execute("INSERT INTO courses(code,title,lecturer_id) VALUES (?,?,?)",(code,text(title,150),lecturer)).lastrowid
        db.execute("INSERT INTO offerings VALUES (?,?,?,?,?,?,?,'Fall 2026')",(cid,credits,capacity,day,start,end,text(room,30)))
        event(self.bus,db,user,'course_created',cid,[lecturer],'New course offering')
    def assign_programme(self,db,user,sid,pid):
        role(user,'admin')
        one(db,"SELECT id FROM users WHERE id=? AND role='student'",(sid,))
        one(db,"SELECT id FROM programmes WHERE id=?",(pid,))
        db.execute("INSERT INTO student_programmes VALUES (?,?) ON CONFLICT(student_id) DO UPDATE SET programme_id=excluded.programme_id",(sid,pid))
        event(self.bus,db,user,'programme_assigned',pid,[sid],'Academic programme assigned')
