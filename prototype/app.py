"""Local demo web application. Run python -m prototype.app."""
from http.server import HTTPServer, BaseHTTPRequestHandler
from contextlib import closing
from email.parser import BytesParser
from email.policy import default
from http.cookies import SimpleCookie
from urllib.parse import parse_qs, urlsplit, quote
from pathlib import Path
import argparse, os, secrets
from .db import Database
from .identity import IdentityService, DomainError
from .courses import CourseService
from .learning import LearningFacade, LearningRepository, SQLiteFileAdapter, EventBus, AuditObserver, NotificationObserver, MAX_FILE
from . import views

def make_server(path, port=8000):
    database=Database(path); database.initialize()
    identity=IdentityService(); courses=CourseService()
    events=EventBus(); events.subscribe(AuditObserver()); events.subscribe(NotificationObserver())
    learning=LearningFacade(courses,LearningRepository(),SQLiteFileAdapter(),events)
    class Handler(BaseHTTPRequestHandler):
        def send(self, status, body, kind='text/html; charset=utf-8', headers=None):
            if isinstance(body,str): body=body.encode()
            self.send_response(status)
            self.send_header('Content-Type',kind)
            self.send_header('Content-Length',str(len(body)))
            self.send_header('Cache-Control','no-store')
            self.send_header('X-Content-Type-Options','nosniff')
            self.send_header('X-Frame-Options','DENY')
            self.send_header('Content-Security-Policy',"default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'")
            for k,v in (headers or {}).items(): self.send_header(k,v)
            self.end_headers(); self.wfile.write(body)
        def redirect(self, cookie=None):
            headers={'Location':'/'}
            if cookie: headers['Set-Cookie']=cookie
            self.send(303,b'',headers=headers)
        def form(self):
            size=int(self.headers.get('Content-Length','0'))
            if not 0<=size<=MAX_FILE+65536: raise DomainError('Request too large',413)
            raw=self.rfile.read(size)
            content_type=self.headers.get('Content-Type','')
            if content_type.startswith('multipart/form-data'):
                msg=BytesParser(policy=default).parsebytes(('Content-Type: '+content_type+'\r\nMIME-Version: 1.0\r\n\r\n').encode()+raw)
                result={}
                for part in msg.iter_parts():
                    name=part.get_param('name',header='content-disposition')
                    data=part.get_payload(decode=True)
                    if name in result or not name: raise DomainError('Invalid form')
                    result[name]=(part.get_filename(),data) if part.get_filename() is not None else data.decode()
                return result
            if content_type.startswith('application/x-www-form-urlencoded'):
                return {k:v[0] for k,v in parse_qs(raw.decode(),keep_blank_values=True).items()}
            raise DomainError('Unsupported form type',415)
        def token(self):
            cookies=SimpleCookie(); cookies.load(self.headers.get('Cookie',''))
            return cookies['session'].value if 'session' in cookies else ''
        def do_GET(self): self.handle_request(False)
        def do_POST(self): self.handle_request(True)
        def handle_request(self, post):
            try:
                with closing(database.connect()) as db:
                    user,csrf=identity.resolve(db,self.token())
                    route=urlsplit(self.path)
                    if post:
                        form=self.form()
                        if route.path=='/login':
                            # Reject cross-origin browser login requests; localhost demo only.
                            origin=self.headers.get('Origin')
                            if origin and origin != 'http://'+self.headers.get('Host',''): raise DomainError('Invalid origin',403)
                            token=identity.authenticate(db,form.get('username',''),form.get('password',''))
                            return self.redirect('session='+token+'; HttpOnly; SameSite=Strict; Path=/; Max-Age=3600')
                        if not user: raise DomainError('Log in first',401)
                        if not secrets.compare_digest(form.get('csrf',''),csrf): raise DomainError('Invalid CSRF token',403)
                        if route.path=='/logout':
                            identity.logout(self.token())
                            return self.redirect('session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0')
                        with db:
                            db.execute('BEGIN IMMEDIATE')
                            if route.path=='/publish':
                                learning.publish_assignment(db,user,int(form['course_id']),form['title'],form['description'],form['due_at']+'+04:00',int(form['max_points']),form['policy'])
                            elif route.path=='/submit':
                                filename,content=form['file']
                                learning.submit(db,user,int(form['assignment_id']),filename,content)
                            elif route.path=='/grade':
                                learning.grade(db,user,int(form['submission_id']),int(form['score']),form['comment'])
                            elif route.path=='/enroll':
                                courses.enroll(db,user,int(form['course_id']),int(form['student_id']))
                            else: raise DomainError('Page not found',404)
                        return self.redirect()
                    if route.path=='/download':
                        if not user: raise DomainError('Log in first',401)
                        sid=int(parse_qs(route.query)['id'][0])
                        filename,content=learning.download(db,user,sid)
                        return self.send(200,content,'application/octet-stream',{'Content-Disposition':"attachment; filename*=UTF-8''"+quote(filename,safe='')})
                    if route.path!='/': raise DomainError('Page not found',404)
                    return self.send(200,views.dashboard(db,user,csrf,courses,learning) if user else views.login())
            except DomainError as e: self.send(e.status,views.error(str(e)))
            except (ValueError,KeyError,TypeError,UnicodeError): self.send(400,views.error('Invalid or missing request fields'))
            except Exception:
                import traceback; traceback.print_exc()
                self.send(500,views.error('Unexpected error. No successful transaction was reported.'))
    return HTTPServer(('127.0.0.1',port),Handler)

if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--port',type=int,default=8000)
    parser.add_argument('--db',default=str(Path(__file__).parent/'runtime'/'discivium.sqlite3'))
    args=parser.parse_args()
    server=make_server(args.db,args.port)
    print(f'Discivium local demo: http://127.0.0.1:{args.port}',flush=True)
    try: server.serve_forever()
    except KeyboardInterrupt: pass
    finally: server.server_close()
