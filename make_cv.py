"""Generate the short public CV from the same source as the website."""
import json
from pathlib import Path
from xml.sax.saxutils import escape
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable, PageBreak, KeepTogether

root = Path(__file__).resolve().parent
p = json.loads((root / 'content/profile.json').read_text(encoding='utf-8'))
target = root / 'public/cv.pdf'
green = colors.HexColor('#284e40')
ink = colors.HexColor('#252d29')
muted = colors.HexColor('#626b63')
styles = {
    'name': ParagraphStyle('name', fontName='Times-Roman', fontSize=29, leading=34, textColor=ink, spaceAfter=9),
    'body': ParagraphStyle('body', fontName='Helvetica', fontSize=10, leading=15, textColor=ink, spaceAfter=8),
    'small': ParagraphStyle('small', fontName='Helvetica', fontSize=8.5, leading=13, textColor=muted, spaceAfter=8),
    'section': ParagraphStyle('section', fontName='Times-Roman', fontSize=17, leading=21, textColor=green, spaceBefore=19, spaceAfter=9),
    'title': ParagraphStyle('title', fontName='Helvetica-Bold', fontSize=10, leading=15, textColor=ink, spaceAfter=5),
}
def plain(text):
    return escape(text.replace('\u2013', '-').replace('\u2014', '-').replace('\u2019', "'"))
def para(text, style='body'):
    return Paragraph(plain(text), styles[style])
doc = SimpleDocTemplate(str(target), pagesize=(612,792), leftMargin=49,rightMargin=49,topMargin=43,bottomMargin=43,
                        title=f'{p["name"]} - Short CV',author=p['name'],subject=f'Selected academic record; edition {p["updated"]}')
story = [para(p['name'],'name'),para(f'UC Berkeley | {p["email"]}','small'),
         HRFlowable(width='100%', thickness=.7, color=green),Spacer(1,13),para(p['bio']),
         para('Education','section'),para(p['institution'],'title'),
         para('Undergraduate | ' + ' & '.join(p['studies'])),
         para('Research interests','section'),para('; '.join(p['interests'])),
         para('Academic training','section'),para(p['training']['summary']),
         para('In progress - Fall 2026','title')]
for course in p['training']['inProgress']:
    story += [para(f'{course["code"]}: {course["title"]}', 'small')]
story += [Spacer(1,9),para('Selected completed coursework','title')]
for course in p['training']['completed']:
    story += [para(f'{course["code"]}: {course["title"]} ({course["term"]})','small')]
story += [PageBreak(),para(p['name'],'name'),para('Course research','small'),
          HRFlowable(width='100%',thickness=.7,color=green),para('Course papers in progress','section')]
for project in p['ongoingProjects']:
    story += [KeepTogether([para(project['title'],'title'),para(f'{project["period"]} | {project["type"]}','small'),
              para(f'{project["courseCode"]}: {project["courseTitle"]}'),
              para('Topic development. Topic and mentor not yet determined. Abstract coming soon.','small'),Spacer(1,7)])]
story += [para('Previous course research','section')]
for project in p['projects']:
    story += [para(project['title'],'title'),para(f'{project["period"]} | {project["type"]}','small'),
              para(project['description']),para(f'{project["context"]}. Instructor: {project["instructor"]}.','small'),Spacer(1,7)]
story += [Spacer(1,12),HRFlowable(width='100%',thickness=.4,color=colors.HexColor('#d7dcd2')),Spacer(1,10),
          para(f'Updated {p["updated"]}. Course papers are not listed as publications.','small')]
def footer(canvas, document):
    canvas.setFont('Helvetica',8)
    canvas.setFillColor(muted)
    canvas.drawString(49,25,f'{p["name"]} | {p["updated"]}')
    canvas.drawRightString(563,25,str(document.page))
doc.build(story,onFirstPage=footer,onLaterPages=footer)
print(f'Created {target}')
