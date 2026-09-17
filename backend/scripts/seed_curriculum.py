import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal
from app.models.curriculum import Subject, Module, Topic

CURRICULUM_DATA = [
  {
    "subject": "Use of English",
    "module": "Core Syllabus",
    "topics": [
      "Comprehension", "Summary", "Lexis & Structure", "Oral English",
      "Sentence Construction", "Registers/Usage", "Figures of Speech", "Writing"
    ]
  },
  {
    "subject": "Mathematics",
    "module": "Core Syllabus",
    "topics": [
      "Number & Numeration", "Algebra", "Geometry & Mensuration", "Trigonometry",
      "Calculus", "Statistics & Probability", "Vectors/Mechanics", "Coordinate Geometry"
    ]
  },
  {
    "subject": "Physics",
    "module": "Core Syllabus",
    "topics": [
      "Measurements & Units", "Mechanics", "Heat", "Waves", "Optics",
      "Electricity", "Magnetism", "Modern Physics", "Electronics"
    ]
  },
  {
    "subject": "Chemistry",
    "module": "Core Syllabus",
    "topics": [
      "Atomic Structure", "Periodicity", "Chemical Bonding", "Stoichiometry",
      "States of Matter", "Energy Changes", "Acids/Bases/Salts",
      "Organic Chemistry", "Inorganic Chemistry", "Chemistry & Environment"
    ]
  },
  {
    "subject": "Biology",
    "module": "Core Syllabus",
    "topics": [
      "Cell Biology", "Organisation of Life", "Nutrition", "Transport",
      "Respiration", "Excretion", "Coordination", "Reproduction",
      "Genetics", "Evolution", "Ecology", "Adaptation", "Biotechnology"
    ]
  }
]

from app.models.organization import Programme

def seed_curriculum():
    db = SessionLocal()
    try:
        programme = db.query(Programme).filter(Programme.name == "Science UTME prep").first()
        if not programme:
            print("Run seed.py first to create the Science UTME prep programme.")
            return
            
        subject_order = 1
        for subject_data in CURRICULUM_DATA:
            # Create Subject
            subject = db.query(Subject).filter(Subject.name == subject_data["subject"], Subject.programme_id == programme.id).first()
            if not subject:
                subject = Subject(
                    programme_id=programme.id,
                    name=subject_data["subject"],
                    description=f"{subject_data['subject']} Curriculum",
                    order_index=subject_order
                )
                db.add(subject)
                db.commit()
                db.refresh(subject)
                print(f"Added Subject: {subject.name}")
            subject_order += 1

            # Create Module
            module = db.query(Module).filter(Module.subject_id == subject.id, Module.name == subject_data["module"]).first()
            if not module:
                module = Module(
                    subject_id=subject.id,
                    name=subject_data["module"],
                    description="Standard UTME Core",
                    order_index=1
                )
                db.add(module)
                db.commit()
                db.refresh(module)

            # Create Topics
            topic_order = 1
            for topic_name in subject_data["topics"]:
                topic = db.query(Topic).filter(Topic.module_id == module.id, Topic.name == topic_name).first()
                if not topic:
                    topic = Topic(
                        module_id=module.id,
                        name=topic_name,
                        description=f"{topic_name} core concepts",
                        order_index=topic_order
                    )
                    db.add(topic)
                topic_order += 1
            
            db.commit()

        print("Curriculum seeding complete!")
    finally:
        db.close()

if __name__ == "__main__":
    seed_curriculum()
