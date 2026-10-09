/**
 * Role knowledge base for the role recommender (server/careerAdvisor.js).
 * Each role lists the skills it needs with a weight: 3 = core, 2 = important, 1 = nice to have.
 * An entry can be one skill or a group where any one counts (e.g. any SQL database),
 * written as [[options], weight, label]. Skill names match shared/skillsCatalog.js.
 */
const SQLS = ['SQL', 'MySQL', 'PostgreSQL', 'Oracle', 'SQL Server'];
const CLOUD = ['AWS', 'Azure', 'Google Cloud'];
const LANGS = ['Java', 'Python', 'C++', 'C#', 'Go', 'JavaScript', 'C'];
const SPOKEN = ['English', 'Hindi', 'Telugu'];

export const ROLES = [
  // Web
  { title: 'Frontend Developer', skills: [['React', 3], ['JavaScript', 3], ['HTML', 2], ['CSS', 2], ['TypeScript', 2], ['Responsive design', 1], ['Web accessibility', 1], ['Redux', 1], ['Next.js', 1], ['Git', 1]] },
  { title: 'React Developer', skills: [['React', 3], ['JavaScript', 3], ['Redux', 2], ['TypeScript', 2], ['HTML', 1], ['CSS', 1], ['Next.js', 1], ['REST APIs', 1], ['Git', 1]] },
  { title: 'Angular Developer', skills: [['Angular', 3], ['TypeScript', 3], ['JavaScript', 2], ['HTML', 1], ['CSS', 1], ['REST APIs', 1], ['Git', 1]] },
  { title: 'Vue.js Developer', skills: [['Vue.js', 3], ['JavaScript', 3], ['HTML', 1], ['CSS', 1], ['TypeScript', 1], ['Git', 1]] },
  { title: 'Node.js Developer', skills: [['Node.js', 3], ['JavaScript', 3], ['Express.js', 2], ['REST APIs', 2], [SQLS, 2, 'SQL'], ['MongoDB', 1], ['GraphQL', 1], ['TypeScript', 1], ['Docker', 1], ['Git', 1]] },
  { title: 'Full Stack Developer', skills: [['JavaScript', 3], ['React', 3], ['Node.js', 3], ['Express.js', 1], ['REST APIs', 2], [SQLS, 2, 'SQL'], ['MongoDB', 1], ['HTML', 1], ['CSS', 1], ['Git', 1]] },
  { title: 'Web Developer', skills: [['HTML', 3], ['CSS', 3], ['JavaScript', 3], ['Responsive design', 2], ['Bootstrap', 1], ['Tailwind CSS', 1], ['jQuery', 1], ['PHP', 1], ['Git', 1]] },
  { title: 'PHP Developer', skills: [['PHP', 3], ['Laravel', 2], [SQLS, 2, 'SQL'], ['HTML', 1], ['JavaScript', 1], ['REST APIs', 1], ['Git', 1]] },
  // Backend and general software
  { title: 'Java Developer', skills: [['Java', 3], ['Spring Boot', 3], [SQLS, 2, 'SQL'], ['REST APIs', 2], ['OOP', 2], ['Hibernate', 1], ['Microservices', 1], ['Data Structures & Algorithms', 1], ['Git', 1]] },
  { title: 'Python Developer', skills: [['Python', 3], [['Django', 'Flask', 'FastAPI'], 2, 'Django / Flask / FastAPI'], [SQLS, 2, 'SQL'], ['REST APIs', 2], ['OOP', 1], ['Git', 1], ['Linux', 1]] },
  { title: '.NET Developer', skills: [['C#', 3], ['.NET', 3], [SQLS, 2, 'SQL'], ['REST APIs', 2], ['OOP', 1], ['Git', 1]] },
  { title: 'Go Developer', skills: [['Go', 3], ['Microservices', 2], ['REST APIs', 2], [SQLS, 1, 'SQL'], ['Docker', 1], ['Kubernetes', 1], ['Git', 1]] },
  { title: 'C++ Developer', skills: [['C++', 3], ['Data Structures & Algorithms', 2], ['C', 2], ['OOP', 2], ['Linux', 1], ['Operating Systems', 1], ['Git', 1]] },
  { title: 'Backend Developer', skills: [[['Java', 'Python', 'Node.js', 'Go', 'C#', 'PHP', 'Ruby', 'Rust', 'Scala', 'Kotlin'], 3, 'A backend language'], ['REST APIs', 3], [SQLS, 3, 'SQL'], ['Microservices', 1], ['GraphQL', 1], ['Redis', 1], ['Elasticsearch', 1], ['Docker', 1], ['System Design', 1], ['Git', 1]] },
  { title: 'Software Engineer', skills: [['Data Structures & Algorithms', 3], [LANGS, 3, 'A programming language'], ['OOP', 2], ['DBMS', 1], ['Operating Systems', 1], ['Computer Networks', 1], [SQLS, 1, 'SQL'], ['System Design', 1], ['Competitive Programming', 1], ['Git', 1]] },
  // Mobile
  { title: 'Android Developer', skills: [['Android', 3], ['Kotlin', 3], ['Java', 2], ['Jetpack Compose', 2], ['Firebase', 1], ['REST APIs', 1], ['Git', 1]] },
  { title: 'iOS Developer', skills: [['iOS', 3], ['Swift', 3], ['SwiftUI', 2], ['REST APIs', 1], ['Git', 1]] },
  { title: 'Flutter Developer', skills: [['Flutter', 3], ['Dart', 3], ['Firebase', 1], ['REST APIs', 1], ['Git', 1]] },
  { title: 'React Native Developer', skills: [['React Native', 3], ['JavaScript', 3], ['React', 2], ['TypeScript', 1], ['REST APIs', 1], ['Git', 1]] },
  // Data and AI
  { title: 'Data Analyst', skills: [[SQLS, 3, 'SQL'], ['Excel', 3], ['Data Analysis', 3], [['Power BI', 'Tableau'], 2, 'Power BI / Tableau'], ['Python', 2], ['Statistics', 2], ['Pandas', 1]] },
  { title: 'Power BI Developer', skills: [['Power BI', 3], [SQLS, 2, 'SQL'], ['Data Analysis', 2], ['Excel', 1]] },
  { title: 'Data Scientist', skills: [['Python', 3], ['Machine Learning', 3], ['Statistics', 3], ['Pandas', 2], ['NumPy', 1], ['Scikit-learn', 2], [SQLS, 2, 'SQL'], ['R', 1], ['Deep Learning', 1], ['Data Analysis', 1]] },
  { title: 'Machine Learning Engineer', skills: [['Python', 3], ['Machine Learning', 3], ['Deep Learning', 2], [['TensorFlow', 'PyTorch'], 2, 'TensorFlow / PyTorch'], ['Scikit-learn', 1], ['Computer Vision', 1], ['NLP', 1], ['Data Structures & Algorithms', 1], ['Docker', 1], ['Git', 1]] },
  { title: 'AI Engineer', skills: [['Generative AI', 3], ['LLMs', 3], ['Python', 3], ['NLP', 2], ['PyTorch', 1], ['REST APIs', 1], ['Docker', 1]] },
  { title: 'Data Engineer', skills: [[SQLS, 3, 'SQL'], ['Python', 3], ['Data Engineering', 3], ['Spark', 2], ['Scala', 1], ['Cassandra', 1], [CLOUD, 1, 'A cloud platform'], ['Linux', 1], ['Git', 1]] },
  // Cloud, DevOps and support
  { title: 'DevOps Engineer', skills: [['Docker', 3], ['Kubernetes', 3], ['Linux', 3], ['CI/CD', 2], [['Jenkins', 'GitHub Actions'], 2, 'Jenkins / GitHub Actions'], [CLOUD, 2, 'A cloud platform'], ['Terraform', 2], ['Bash', 2], ['Ansible', 1], ['Nginx', 1], ['Git', 1]] },
  { title: 'Cloud Engineer', skills: [[CLOUD, 3, 'A cloud platform'], ['Linux', 2], ['Docker', 2], ['Terraform', 2], ['Kubernetes', 1], ['Computer Networks', 1], ['Bash', 1]] },
  { title: 'Technical Support Engineer', skills: [['Customer Support', 3], ['Computer Networks', 2], ['Operating Systems', 2], ['Linux', 2], ['Communication', 2], [SQLS, 1, 'SQL']] },
  { title: 'SQL Developer', skills: [[SQLS, 3, 'SQL'], ['DBMS', 3], ['PostgreSQL', 1], ['Oracle', 1], ['Excel', 1]] },
  // Testing
  { title: 'QA Engineer', skills: [['Manual Testing', 3], ['API Testing', 2], ['Postman', 2], ['Jira', 1], [SQLS, 1, 'SQL'], ['Agile/Scrum', 1]] },
  { title: 'Automation Test Engineer', skills: [[['Selenium', 'Playwright', 'Cypress'], 3, 'Selenium / Playwright / Cypress'], [['Java', 'Python', 'JavaScript'], 3, 'Java / Python / JavaScript'], ['API Testing', 2], ['Manual Testing', 1], [['JUnit', 'Jest'], 1, 'JUnit / Jest'], ['Performance Testing', 1], ['CI/CD', 1], ['Git', 1]] },
  // Security
  { title: 'Cybersecurity Analyst', skills: [['Cybersecurity', 3], ['Network Security', 3], ['SOC', 2], ['Computer Networks', 2], ['Linux', 2], ['Ethical Hacking', 1], ['IAM', 1]] },
  // Design and product
  { title: 'UI/UX Designer', skills: [['UI/UX Design', 3], ['Figma', 3], ['Responsive design', 1], ['HTML', 1], ['CSS', 1], ['Communication', 1]] },
  { title: 'Associate Product Manager', skills: [['Product Management', 3], ['Communication', 2], ['Agile/Scrum', 2], ['Jira', 1], ['Business Analysis', 2], ['Data Analysis', 1], [SQLS, 1, 'SQL']] },
  { title: 'Business Analyst', skills: [['Business Analysis', 3], [SQLS, 2, 'SQL'], ['Excel', 2], ['Communication', 2], ['Power BI', 1], ['Jira', 1], ['Agile/Scrum', 1]] },
  // Business and non-tech
  { title: 'Digital Marketing Executive', skills: [['Digital Marketing', 3], ['SEO', 3], ['Content Writing', 2], ['Communication', 1], ['Excel', 1]] },
  { title: 'Content Writer', skills: [['Content Writing', 3], ['English', 3], ['SEO', 2], ['Communication', 1]] },
  { title: 'Sales Executive', skills: [['Sales', 3], ['Communication', 3], [SPOKEN, 1, 'A spoken language'], ['Excel', 1]] },
  { title: 'Customer Support Executive', skills: [['Customer Support', 3], ['Communication', 3], [SPOKEN, 2, 'A spoken language']] },
  { title: 'HR Recruiter', skills: [['HR & Recruitment', 3], ['Communication', 3], ['Excel', 1], ['English', 1]] },
  { title: 'Accountant', skills: [['Accounting', 3], ['Tally', 3], ['Excel', 2], ['Finance', 2]] },
  { title: 'Financial Analyst', skills: [['Finance', 3], ['Excel', 3], ['Accounting', 2], ['Data Analysis', 2], ['Statistics', 1]] },
  { title: 'Operations Executive', skills: [['Operations', 3], ['Excel', 2], ['Communication', 2]] },
];

// Other ways people write the same skill
const ALIASES = {
  js: 'javascript', reactjs: 'react', nodejs: 'nodejs', node: 'nodejs', vue: 'vuejs', golang: 'go',
  ml: 'machinelearning', dl: 'deeplearning', ai: 'generativeai', genai: 'generativeai', llm: 'llms',
  dsa: 'datastructuresalgorithms', datastructures: 'datastructuresalgorithms', algorithms: 'datastructuresalgorithms',
  postgres: 'postgresql', k8s: 'kubernetes', gcp: 'googlecloud', msexcel: 'excel', microsoftexcel: 'excel',
  python3: 'python', ts: 'typescript', springboot: 'springboot', spring: 'springboot', dotnet: 'net', aspnet: 'net',
  restapi: 'restapis', rest: 'restapis', html5: 'html', css3: 'css', scrum: 'agilescrum', agile: 'agilescrum',
  uiux: 'uiuxdesign', uxdesign: 'uiuxdesign', powerbi: 'powerbi', manualtesting: 'manualtesting', testing: 'manualtesting',
};

/** Normalised key for matching skill names: "Node.js" / "NodeJS" / "node" → "nodejs". */
export function skillKey(name) {
  const k = String(name || '').toLowerCase().replace(/[^a-z0-9+#]/g, '');
  return ALIASES[k] || k;
}
