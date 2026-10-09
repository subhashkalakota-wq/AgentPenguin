// Skills people can pick in their Penguin Profile, grouped for browsing.
// Covers tech and non-tech roles; anything missing can be typed in.
export const SKILL_CATALOG = [
  { group: 'Programming languages', skills: ['Java', 'Python', 'JavaScript', 'TypeScript', 'C', 'C++', 'C#', 'Go', 'Kotlin', 'Swift', 'Rust', 'PHP', 'Ruby', 'Scala', 'R', 'Dart', 'SQL', 'Bash'] },
  { group: 'Frontend', skills: ['HTML', 'CSS', 'React', 'Next.js', 'Angular', 'Vue.js', 'Redux', 'Tailwind CSS', 'Bootstrap', 'jQuery', 'Responsive design', 'Web accessibility'] },
  { group: 'Backend', skills: ['Node.js', 'Express.js', 'Spring Boot', 'Django', 'Flask', 'FastAPI', '.NET', 'REST APIs', 'GraphQL', 'Microservices', 'Hibernate', 'Laravel'] },
  { group: 'Mobile', skills: ['Android', 'iOS', 'React Native', 'Flutter', 'Jetpack Compose', 'SwiftUI'] },
  { group: 'Databases', skills: ['MySQL', 'PostgreSQL', 'MongoDB', 'Oracle', 'SQL Server', 'Redis', 'Firebase', 'Elasticsearch', 'Cassandra'] },
  { group: 'Cloud & DevOps', skills: ['AWS', 'Azure', 'Google Cloud', 'Docker', 'Kubernetes', 'Jenkins', 'GitHub Actions', 'Terraform', 'Linux', 'CI/CD', 'Nginx', 'Ansible'] },
  { group: 'Data & AI', skills: ['Machine Learning', 'Deep Learning', 'Data Analysis', 'Pandas', 'NumPy', 'Scikit-learn', 'TensorFlow', 'PyTorch', 'NLP', 'Computer Vision', 'Generative AI', 'LLMs', 'Power BI', 'Tableau', 'Excel', 'Statistics', 'Spark', 'Data Engineering'] },
  { group: 'Testing', skills: ['Manual Testing', 'Selenium', 'Playwright', 'Cypress', 'JUnit', 'Jest', 'API Testing', 'Postman', 'Performance Testing'] },
  { group: 'CS fundamentals', skills: ['Data Structures & Algorithms', 'OOP', 'DBMS', 'Operating Systems', 'Computer Networks', 'System Design', 'Competitive Programming', 'Git'] },
  { group: 'Security', skills: ['Cybersecurity', 'Network Security', 'Ethical Hacking', 'SOC', 'IAM'] },
  { group: 'Design & product', skills: ['UI/UX Design', 'Figma', 'Product Management', 'Agile/Scrum', 'Jira', 'Business Analysis'] },
  { group: 'Business & non-tech', skills: ['Sales', 'Digital Marketing', 'SEO', 'Content Writing', 'Customer Support', 'HR & Recruitment', 'Accounting', 'Tally', 'Finance', 'Operations', 'Communication', 'English', 'Hindi', 'Telugu'] },
];

export const ALL_SKILLS = SKILL_CATALOG.flatMap(g => g.skills);

// Level from a skill-test score (percent)
export const levelFromScore = (pct) => (pct >= 90 ? 'Expert' : pct >= 70 ? 'Advanced' : pct >= 40 ? 'Intermediate' : 'Beginner');
