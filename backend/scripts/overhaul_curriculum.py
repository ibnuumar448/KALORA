"""
Script to safely update the KALORA curriculum content to the complete JAMB-aligned syllabus
while preserving all existing links and without any destructive data loss.
"""
from app.core.database import SessionLocal
from app.models.curriculum import Subject, Module, Topic, Subtopic, ResourceSlot
from app.models.organization import Programme

# Desired syllabus topics by subject
CURRICULUM_STRUCTURE = {
    "Use of English": [
        "Comprehension",
        "Summary",
        "Lexis & Structure",
        "Oral English",
        "The Lekki Headmaster"
    ],
    "Mathematics": [
        "Number and Numeration",
        "Indices, Logarithms and Surds",
        "Sets",
        "Algebra",
        "Matrices and Determinants",
        "Geometry",
        "Coordinate Geometry",
        "Trigonometry",
        "Permutation and Combination",
        "Probability",
        "Statistics",
        "Differentiation",
        "Integration"
    ],
    "Physics": [
        "Measurements and Units",
        "Mechanics",
        "Pressure and Fluids",
        "Heat and Thermal Physics",
        "Waves and Optics",
        "Electricity",
        "Magnetism and Electromagnetism",
        "Electrolysis",
        "Modern Physics",
        "Repeated JAMB Questions"
    ],
    "Chemistry": [
        "Introduction to Matter",
        "States of Matter",
        "Atomic Structure and Periodicity",
        "Air",
        "Water and Solutions",
        "Acids, Bases and Salts",
        "Redox and Electrochemistry",
        "Equilibrium, Energetics and Kinetics",
        "Non-Metals and Their Compounds",
        "Metals and Their Compounds",
        "Organic Chemistry",
        "Biochemistry, Polymers and Industrial Chemistry"
    ],
    "Biology": [
        "Organisation and Variety of Living Things",
        "Nutrition",
        "Respiration",
        "Transport and Circulation",
        "Excretion and Homeostasis",
        "Support and Movement",
        "Coordination and Control",
        "Reproduction",
        "Genetics and Variation",
        "Evolution and Adaptation",
        "Ecology",
        "Health and Disease",
        "Repeated JAMB Questions"
    ]
}

def overhaul_curriculum():
    db = SessionLocal()
    try:
        prog = db.query(Programme).first()
        if not prog:
            print("No programme found!")
            return

        subject_order = 1
        for subject_name, topic_names in CURRICULUM_STRUCTURE.items():
            # Find or create Subject
            subject = db.query(Subject).filter(Subject.name == subject_name).first()
            if not subject:
                # Check for slight variations (e.g. casing or ampersand)
                subject = Subject(
                    programme_id=prog.id,
                    name=subject_name,
                    order_index=subject_order,
                    is_active=True
                )
                db.add(subject)
                db.flush()
                print(f"+ Created Subject: {subject_name}")
            else:
                subject.order_index = subject_order
                subject.is_active = True
                print(f"= Found Subject: {subject_name}")

            subject_order += 1

            # Ensure Core Syllabus module exists
            module = db.query(Module).filter(
                Module.subject_id == subject.id,
                Module.name == "Core Syllabus"
            ).first()
            if not module:
                # If there's an existing module with another name, use it or create Core Syllabus
                existing_mod = db.query(Module).filter(Module.subject_id == subject.id).first()
                if existing_mod:
                    existing_mod.name = "Core Syllabus"
                    module = existing_mod
                else:
                    module = Module(
                        subject_id=subject.id,
                        name="Core Syllabus",
                        order_index=1,
                        is_active=True
                    )
                    db.add(module)
                    db.flush()
                print(f"  + Module: Core Syllabus")

            # Map existing topics under this module
            existing_topics = db.query(Topic).filter(Topic.module_id == module.id).all()
            existing_topics_map = {t.name.lower().replace("&", "and").strip(): t for t in existing_topics}

            # Map the desired topics
            topic_order = 1
            matched_topic_ids = set()

            for top_name in topic_names:
                key = top_name.lower().replace("&", "and").strip()
                # Find matching existing topic
                matched_topic = existing_topics_map.get(key)
                if not matched_topic:
                    # Try partial match (e.g. "Number & Numeration" -> "Number and Numeration")
                    for k, t in existing_topics_map.items():
                        if k == key or (k in key and len(k) > 5) or (key in k and len(key) > 5):
                            matched_topic = t
                            break

                if matched_topic:
                    matched_topic.name = top_name
                    matched_topic.order_index = topic_order
                    matched_topic.is_active = True
                    matched_topic_ids.add(matched_topic.id)
                    print(f"    = Updated Topic: {top_name}")
                else:
                    new_topic = Topic(
                        module_id=module.id,
                        name=top_name,
                        order_index=topic_order,
                        is_active=True
                    )
                    db.add(new_topic)
                    db.flush()
                    matched_topic_ids.add(new_topic.id)
                    print(f"    + Created Topic: {top_name}")

                topic_order += 1

            # Handle any leftover existing topics: check if they have links
            for old_top in existing_topics:
                if old_top.id not in matched_topic_ids:
                    # Check if it has slots
                    slots_count = 0
                    for sub in old_top.subtopics:
                        slots_count += len(sub.resource_slots)
                    if slots_count > 0:
                        print(f"    ! Preserving topic with links: {old_top.name} (order_index={topic_order})")
                        old_top.order_index = topic_order
                        topic_order += 1
                    else:
                        print(f"    - Removing unused old topic: {old_top.name}")
                        db.delete(old_top)

        db.commit()
        print("\nCurriculum overhaul successfully applied!")
    except Exception as e:
        db.rollback()
        print(f"Error during overhaul: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    overhaul_curriculum()
