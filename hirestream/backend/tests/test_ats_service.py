from app.services.ats_service import calculate_ats_score, extract_skills_from_text

def test_extract_skills_from_text():
    sample_text = """
    Senior Full-Stack Engineer with 5 years experience in Python, FastAPI, React, TypeScript,
    PostgreSQL, Docker, and Kubernetes on AWS.
    """
    skills = extract_skills_from_text(sample_text)
    assert "python" in skills
    assert "fastapi" in skills
    assert "react" in skills
    assert "typescript" in skills
    assert "postgresql" in skills
    assert "docker" in skills

def test_calculate_ats_score_high_match():
    resume = """
    Experienced Python and React developer. Skilled in FastAPI, PostgreSQL, Docker,
    AWS, unit testing, Git, and REST API development. Strong analytical skills.
    """
    jd = """
    Looking for a Senior Python Developer with React, FastAPI, PostgreSQL, and Docker.
    Must know REST API and cloud deployment on AWS.
    """
    required_skills = "Python, React, FastAPI, PostgreSQL, Docker"
    
    result = calculate_ats_score(resume, jd, required_skills)
    
    assert "score" in result
    assert "similarity" in result
    assert "matched_skills" in result
    assert "missing_skills" in result
    assert result["score"] >= 60.0
    assert "python" in [s.lower() for s in result["matched_skills"]]

def test_calculate_ats_score_empty_inputs():
    result_empty_resume = calculate_ats_score("", "Job description looking for Java.")
    assert result_empty_resume["score"] == 0

    result_empty_jd = calculate_ats_score("Resume with Python.", "")
    assert result_empty_jd["score"] == 0

def test_calculate_ats_score_bounds():
    resume = "Python React developer"
    jd = "Python React developer"
    result = calculate_ats_score(resume, jd, "Python, React")
    assert 0 <= result["score"] <= 100
