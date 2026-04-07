"""
Job Description Generator Service
Uses template-based generation with optional T5-small or GPT-2 model.
Falls back to rich template generation if transformers not available.
"""
from typing import Optional

JD_TEMPLATE = """
{title} - Job Description

About the Role:
We are seeking a talented and motivated {title} to join our {department} team. 
In this role, you will work on cutting-edge projects that impact our business and collaborate 
with cross-functional teams to deliver high-quality solutions.

Location: {location}

Key Responsibilities:
• Design, develop, and maintain high-quality solutions using {skills_list}
• Collaborate with cross-functional teams including product managers, designers, and engineers
• Participate in code reviews and contribute to engineering best practices
• Analyze requirements and translate them into technical specifications
• Identify and resolve complex technical challenges
• Mentor junior team members and contribute to team knowledge sharing
• Contribute to the continuous improvement of development processes and tools

Required Skills & Qualifications:
{skills_bullets}
• Strong problem-solving and analytical skills
• Excellent communication and teamwork abilities
• Experience working in an Agile/Scrum environment
• Bachelor's degree in Computer Science, Engineering, or a related field (or equivalent experience)

Preferred Qualifications:
• Prior experience in a {department} environment
• Familiarity with CI/CD pipelines and DevOps practices
• Experience with cloud platforms (AWS, Azure, or GCP)
• Contributions to open-source projects

What We Offer:
• Competitive salary and comprehensive benefits package
• Flexible work arrangements and hybrid/remote options
• Opportunities for professional growth and development
• Collaborative and inclusive work culture
• Health, dental, and vision insurance
• Annual learning and development budget

How to Apply:
Submit your updated resume and a brief cover letter explaining your relevant experience.
We look forward to hearing from you!
"""

def generate_job_description(title: str, skills: str, department: Optional[str] = None, location: Optional[str] = None) -> str:
    """
    Generate a job description using template-based approach.
    Optionally uses T5-small or GPT-2 for enhancement if available.
    """
    print(f"\n[JD SERVICE] Generating for: {title}")
    print(f"[JD SERVICE] Skills Provided: {skills}")
    
    dept = department or "Technology"
    loc = location or "Remote / Hybrid"
    skills_list_items = [s.strip() for s in skills.split(",") if s.strip()]
    skills_list = ", ".join(skills_list_items)
    skills_bullets = "\n".join(f"• Proficiency in {s.strip()}" for s in skills_list_items)

    jd = JD_TEMPLATE.format(
        title=title,
        department=dept,
        location=loc,
        skills_list=skills_list,
        skills_bullets=skills_bullets,
    ).strip()

    print(f"[JD SERVICE] Template JD generated. Length: {len(jd)}")

    # Try to enhance with T5-small if available
    try:
        from transformers import pipeline
        print("[JD SERVICE] Attempting AI Enhancement with Transformers...")
        summarizer = pipeline("text2text-generation", model="t5-small")
        prompt = f"generate job description for {title} requiring skills: {skills_list}"
        result = summarizer(prompt, max_length=200, do_sample=True, temperature=0.7)
        if result and result[0].get("generated_text"):
            enhancement = result[0]["generated_text"]
            jd = jd + f"\n\nAdditional Context:\n{enhancement}"
            print("[JD SERVICE] AI Enhancement Successful.")
    except Exception as e:
        print(f"[JD SERVICE] AI Enhancement skipped/failed: {str(e)}")
        pass  # Use template-only fallback

    return jd
