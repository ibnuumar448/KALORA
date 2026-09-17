import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal
from app.models.curriculum import Subject, Module, Topic
from app.models.assessment import Assessment, AssessmentType, QuestionBank, AssessmentQuestion

ASSESSMENTS_DATA = [
    {
        "subject": "Mathematics",
        "topic": "Algebra",
        "name": "Algebra Fundamentals Quiz",
        "type": "quiz",
        "passing_score": 60,
        "duration_minutes": 30,
        "questions": [
            {
                "text": "What is the value of x in the equation 2x + 5 = 13?",
                "options": ["A) 2", "B) 4", "C) 5", "D) 6"],
                "correct_answer": "B) 4",
                "explanation": "2x + 5 = 13 → 2x = 8 → x = 4",
                "difficulty": "easy"
            },
            {
                "text": "Solve for x: 3x² - 12 = 0",
                "options": ["A) x = 2 or x = -2", "B) x = 3", "C) x = 4", "D) x = 1"],
                "correct_answer": "A) x = 2 or x = -2",
                "explanation": "3x² = 12 → x² = 4 → x = ±2",
                "difficulty": "medium"
            },
            {
                "text": "Which of the following is a polynomial?",
                "options": ["A) x²/(x+1)", "B) 2x³ + 3x - 5", "C) 1/x", "D) √x"],
                "correct_answer": "B) 2x³ + 3x - 5",
                "explanation": "A polynomial has variables with non-negative integer exponents",
                "difficulty": "medium"
            }
        ]
    },
    {
        "subject": "Physics",
        "topic": "Mechanics",
        "name": "Kinematics Quiz",
        "type": "quiz",
        "passing_score": 60,
        "duration_minutes": 25,
        "questions": [
            {
                "text": "An object accelerates at 2 m/s² for 5 seconds. What is its final velocity if initial velocity is 0?",
                "options": ["A) 5 m/s", "B) 10 m/s", "C) 15 m/s", "D) 20 m/s"],
                "correct_answer": "B) 10 m/s",
                "explanation": "v = u + at = 0 + 2(5) = 10 m/s",
                "difficulty": "easy"
            },
            {
                "text": "Which of the following is NOT a vector quantity?",
                "options": ["A) Velocity", "B) Acceleration", "C) Speed", "D) Displacement"],
                "correct_answer": "C) Speed",
                "explanation": "Speed is scalar (magnitude only), others are vectors (magnitude + direction)",
                "difficulty": "easy"
            },
            {
                "text": "An object is thrown vertically upward with initial velocity 20 m/s. What is the maximum height? (g = 10 m/s²)",
                "options": ["A) 10 m", "B) 15 m", "C) 20 m", "D) 25 m"],
                "correct_answer": "C) 20 m",
                "explanation": "h = u²/(2g) = 400/20 = 20 m",
                "difficulty": "medium"
            }
        ]
    },
    {
        "subject": "Chemistry",
        "topic": "Atomic Structure",
        "name": "Atomic Structure Quiz",
        "type": "quiz",
        "passing_score": 60,
        "duration_minutes": 20,
        "questions": [
            {
                "text": "What is the mass number of an atom with 6 protons and 8 neutrons?",
                "options": ["A) 6", "B) 8", "C) 14", "D) 2"],
                "correct_answer": "C) 14",
                "explanation": "Mass number = protons + neutrons = 6 + 8 = 14",
                "difficulty": "easy"
            },
            {
                "text": "Which electron configuration is correct for Nitrogen (N)?",
                "options": ["A) 1s² 2s² 2p²", "B) 1s² 2s² 2p³", "C) 1s² 2p⁴", "D) 2s² 2p⁵"],
                "correct_answer": "B) 1s² 2s² 2p³",
                "explanation": "Nitrogen has 7 electrons: 2 in 1s, 2 in 2s, 3 in 2p",
                "difficulty": "medium"
            }
        ]
    },
    {
        "subject": "Biology",
        "topic": "Cell Biology",
        "name": "Cell Structure Quiz",
        "type": "quiz",
        "passing_score": 60,
        "duration_minutes": 25,
        "questions": [
            {
                "text": "Which of the following is found in plant cells but not in animal cells?",
                "options": ["A) Nucleus", "B) Cell wall", "C) Mitochondria", "D) Ribosome"],
                "correct_answer": "B) Cell wall",
                "explanation": "Cell walls are characteristic of plant cells, fungi, and bacteria",
                "difficulty": "easy"
            },
            {
                "text": "What is the primary function of mitochondria?",
                "options": ["A) Protein synthesis", "B) Energy production", "C) Waste removal", "D) DNA storage"],
                "correct_answer": "B) Energy production",
                "explanation": "Mitochondria produce ATP through cellular respiration",
                "difficulty": "easy"
            },
            {
                "text": "Which organelle is responsible for protein synthesis?",
                "options": ["A) Lysosome", "B) Golgi apparatus", "C) Ribosome", "D) Endoplasmic reticulum"],
                "correct_answer": "C) Ribosome",
                "explanation": "Ribosomes read mRNA and synthesize proteins based on genetic code",
                "difficulty": "medium"
            }
        ]
    }
]

def seed_assessments():
    db = SessionLocal()
    try:
        for assessment_data in ASSESSMENTS_DATA:
            # Find the subject
            subject = db.query(Subject).filter(Subject.name == assessment_data["subject"]).first()
            if not subject:
                print(f"Subject {assessment_data['subject']} not found. Skipping.")
                continue

            # Find the topic
            topic = None
            if assessment_data.get("topic"):
                topic = db.query(Topic).filter(
                    Topic.name == assessment_data["topic"]
                ).first()

            # Create assessment
            assessment = Assessment(
                name=assessment_data["name"],
                type=AssessmentType[assessment_data["type"]],
                topic_id=topic.id if topic else None,
                passing_score=assessment_data["passing_score"],
                duration_minutes=assessment_data.get("duration_minutes"),
                is_active=True
            )
            db.add(assessment)
            db.commit()
            db.refresh(assessment)
            print(f"Created Assessment: {assessment.name}")

            # Create questions
            for q_idx, q_data in enumerate(assessment_data["questions"]):
                # First create in question bank
                question = QuestionBank(
                    subject_id=subject.id,
                    text=q_data["text"],
                    options=q_data["options"],
                    correct_answer=q_data["correct_answer"],
                    explanation=q_data.get("explanation"),
                    difficulty=q_data.get("difficulty")
                )
                db.add(question)
                db.commit()
                db.refresh(question)

                # Then link to assessment
                assessment_question = AssessmentQuestion(
                    assessment_id=assessment.id,
                    question_id=question.id,
                    order_index=q_idx
                )
                db.add(assessment_question)

            db.commit()
            print(f"  Added {len(assessment_data['questions'])} questions")

        print("\nAssessment seeding complete!")
    finally:
        db.close()

if __name__ == "__main__":
    seed_assessments()
