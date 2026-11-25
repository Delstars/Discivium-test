"""Presentation only: HTML escaping, forms and role-specific read views."""
from html import escape
from datetime import datetime, timedelta, timezone
def e(x): return escape(str(x),quote=True)
def hidden(name,value): return f'<input type="hidden" name="{e(name)}" value="{e(value)}">'
def page(title,body):
    return f'''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>{e(title)} · Discivium</title><style>
    *{{box-sizing:border-box}}body{{margin:0;background:#f3f5f9;color:#18243a;font:16px system-ui,sans-serif}}header{{background:#192843;color:white;padding:22px max(20px,calc((100% - 1080px)/2));display:flex;justify-content:space-between;gap:12px}}header b{{font-size:22px;letter-spacing:1px}}main{{max-width:1080px;margin:auto;padding:24px}}section,article{{background:white;border:1px solid #dce2ed;border-radius:14px;padding:20px;margin:16px 0}}article{{background:#f8faff}}h1,h2,h3{{margin:0 0 12px}}p{{line-height:1.5}}small{{color:#5d6980}}label{{display:block;margin:10px 0 4px;font-weight:600}}input,select,textarea{{font:inherit;display:block;width:100%;padding:10px;border:1px solid #b9c5d5;border-radius:8px;background:white}}button{{border:0;background:#245c91;color:white;padding:11px 17px;border-radius:8px;font:inherit;cursor:pointer;margin:12px 0}}header button{{margin:0;background:#385272}}a{{color:#245c91}}.tag{{display:inline-block;background:#e4edf9;padding:5px 10px;border-radius:20px;font-size:13px}}.grid{{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:12px}}.login{{max-width:480px;margin:30px auto}}.muted{{color:#5d6980}}details{{margin:12px 0}}summary{{cursor:pointer;font-weight:600}}footer{{text-align:center;color:#5d6980;padding:20px}}
    </style><header><b>DISCIVIUM / Campus</b><span>BCS305 · Local demonstration</span></header><main>{body}</main><footer>Fictional academic records · Independent course prototype</footer></html>'''
def login():
    return page('Sign in','''<section class="login"><h1>Welcome to Discivium</h1><p>University coursework and academic services.</p><form method="post" action="/login"><label>Username<input name="username" required autocomplete="username"></label><label>Password<input name="password" type="password" required autocomplete="current-password"></label><button>Sign in</button></form><small>Demo accounts: lecturer, student, other, lecturer2, admin, advisor. Password: DemoOnly!2026. Use fictional data only.</small></section>''')
def error(message):
    return page('Request rejected',f'<section><h1>Request rejected</h1><p>{e(message)}</p><a href="/">Return to dashboard</a></section>')
def form(action,csrf,body,upload=False):
    enctype=' enctype="multipart/form-data"' if upload else ''
    return f'<form method="post" action="/{action}"{enctype}>{hidden("csrf",csrf)}{body}</form>'
def dashboard(db,user,csrf,courses,learning):
    chunks=[f'<h1>Welcome, {e(user.name)}</h1><span class="tag">{e(user.role.title())}</span>',form('logout',csrf,'<button>Sign out</button>')]
    if user.role=='admin':
        chunks.append('<section><h2>Enrollment administration</h2><p>Assign a student to a course.</p>')
        co=''.join(f'<option value="{r["id"]}">{e(r["code"]+" "+r["title"])}</option>' for r in db.execute('SELECT * FROM courses'))
        st=''.join(f'<option value="{r["id"]}">{e(r["name"])}</option>' for r in db.execute("SELECT * FROM users WHERE role='student'"))
        chunks.append(form('enroll',csrf,f'<label>Course<select name="course_id">{co}</select></label><label>Student<select name="student_id">{st}</select></label><button>Enroll student</button>'))
        chunks.append('</section>')
    elif user.role=='advisor':
        chunks.append('<section><h2>Academic advising</h2><p>Individual student records are not exposed to this role in the coursework release. Advising workflows are planned, not implemented.</p></section>')
    else:
        for course in courses.visible(db,user):
            cid=course['id']
            chunks.append(f'<section><span class="tag">{e(course["code"])}</span><h2>{e(course["title"])}</h2>')
            if user.role=='lecturer':
                deadline=(datetime.now(timezone(timedelta(hours=4)))+timedelta(days=2)).strftime('%Y-%m-%dT%H:%M')
                chunks.append('<details open><summary>Publish an assignment</summary>'+form('publish',csrf,hidden('course_id',cid)+f'<label>Title<input name="title" required maxlength="200"></label><label>Description<textarea name="description" required></textarea></label><label>Deadline (UAE time)<input type="datetime-local" name="due_at" value="{deadline}" required></label><label>Maximum points<input name="max_points" type="number" min="1" max="1000" value="100" required></label><label>Deadline policy<select name="policy"><option value="allow_late">Allow late submissions</option><option value="strict">Reject late submissions</option></select></label><button>Publish assignment</button>')+'</details>')
            for a in learning.assignments(db,user,cid):
                aid=a['id']; subs=learning.submissions(db,user,aid)
                local_due=datetime.fromisoformat(a['due_at']).astimezone(timezone(timedelta(hours=4))).strftime('%d %b %Y %H:%M UAE')
                chunks.append(f'<article><h3>{e(a["title"])}</h3><p>{e(a["description"])}</p><small>Due {e(local_due)} · {a["max_points"]} points · {e(a["policy"])}</small>')
                if user.role=='student' and not subs:
                    chunks.append(form('submit',csrf,hidden('assignment_id',aid)+'<label>Assignment file (PDF or DOCX)<input type="file" name="file" accept=".pdf,.docx" required></label><button>Submit assignment</button>',True))
                for s in subs:
                    status=s['status']+(' · late' if s['late'] else '')
                    chunks.append(f'<p><b>{e(s["name"])}</b> · <span class="tag">{e(status)}</span> · <a href="/download?id={s["id"]}">{e(s["filename"])}</a></p>')
                    if s['status']=='graded':
                        chunks.append(f'<p><b>Feedback: {s["score"]}/{a["max_points"]}</b><br>{e(s["comment"])}</p>')
                    elif user.role=='lecturer':
                        chunks.append(form('grade',csrf,hidden('submission_id',s['id'])+f'<label>Score<input type="number" name="score" min="0" max="{a["max_points"]}" required></label><label>Feedback<textarea name="comment" required></textarea></label><button>Release feedback</button>'))
                chunks.append('</article>')
            chunks.append('</section>')
    chunks.append('<section><h2>Notifications</h2>')
    for n in db.execute('SELECT * FROM notifications WHERE user_id=? ORDER BY id DESC LIMIT 20',(user.id,)):
        chunks.append(f'<p>{e(n["message"])} <small>{e(n["created_at"][:10])}</small></p>')
    chunks.append('</section>')
    return page('Dashboard',''.join(chunks))
