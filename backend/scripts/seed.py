import sys
import os

# Add the backend root directory to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal
from app.models.organization import Organization, Community, Programme, Cohort


def seed_data():
    db = SessionLocal()
    try:
        org = db.query(Organization).filter(Organization.name == "KALORA").first()
        if not org:
            org = Organization(
                name="KALORA",
                description="Karim Lamido Online Refresher Academy"
            )
            db.add(org)
            db.commit()
            db.refresh(org)
            print("Created Organization: KALORA")

        community = db.query(Community).filter(
            Community.name == "Karim Lamido",
            Community.organization_id == org.id
        ).first()
        if not community:
            community = Community(
                name="Karim Lamido",
                organization_id=org.id,
                location="Taraba State"
            )
            db.add(community)
            db.commit()
            db.refresh(community)
            print("Created Community: Karim Lamido")

        programme = db.query(Programme).filter(
            Programme.name == "Science UTME prep",
            Programme.community_id == community.id
        ).first()
        if not programme:
            programme = Programme(
                name="Science UTME prep",
                community_id=community.id,
                description="Pilot UTME preparation programme for the Karim Lamido community"
            )
            db.add(programme)
            db.commit()
            db.refresh(programme)
            print("Created Programme: Science UTME prep")

        cohort = db.query(Cohort).filter(
            Cohort.name == "Cohort 1",
            Cohort.programme_id == programme.id
        ).first()
        if not cohort:
            cohort = Cohort(
                name="Cohort 1",
                programme_id=programme.id,
            )
            db.add(cohort)
            db.commit()
            db.refresh(cohort)
            print("Created Cohort: Cohort 1")

        print("Pilot seed complete: KALORA / Karim Lamido / Science UTME prep / Cohort 1")

    finally:
        db.close()


if __name__ == "__main__":
    seed_data()
