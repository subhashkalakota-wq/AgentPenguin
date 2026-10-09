// Where to learn a skill when a Penguin skill test shows it needs work.
// DSA goes to Viso DSA, Agent Penguin's own visual DSA platform (/viso-dsa).

const DSA = /data structures|algorithm|\bdsa\b|competitive programming|problem solving/i;

// [match, [[name, url], ...]] — first match wins, so specific entries come first
const LINKS = [
  [/react native/i, [['React Native docs', 'https://reactnative.dev/docs/getting-started']]],
  [/^react$|redux/i, [['react.dev: Learn React', 'https://react.dev/learn']]],
  [/next\.?js/i, [['Next.js Learn', 'https://nextjs.org/learn']]],
  [/angular/i, [['Angular tutorials', 'https://angular.dev/tutorials']]],
  [/vue/i, [['Vue.js guide', 'https://vuejs.org/guide/introduction.html']]],
  [/^html$|^css$|responsive|accessibility|bootstrap|tailwind|jquery/i, [['MDN: Learn web development', 'https://developer.mozilla.org/en-US/docs/Learn_web_development'], ['web.dev Learn', 'https://web.dev/learn']]],
  [/^javascript$/i, [['javascript.info', 'https://javascript.info/'], ['MDN JavaScript guide', 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide']]],
  [/^typescript$/i, [['TypeScript handbook', 'https://www.typescriptlang.org/docs/handbook/intro.html']]],
  [/^java$/i, [['dev.java: Learn Java', 'https://dev.java/learn/'], ['W3Schools Java', 'https://www.w3schools.com/java/']]],
  [/^python$/i, [['Python tutorial', 'https://docs.python.org/3/tutorial/'], ['W3Schools Python', 'https://www.w3schools.com/python/']]],
  [/^c\+\+$/i, [['learncpp.com', 'https://www.learncpp.com/']]],
  [/^c$/i, [['W3Schools C', 'https://www.w3schools.com/c/']]],
  [/^c#$|\.net/i, [['Microsoft Learn: C#', 'https://learn.microsoft.com/en-us/dotnet/csharp/']]],
  [/^go$/i, [['A Tour of Go', 'https://go.dev/tour/']]],
  [/^kotlin$/i, [['Kotlin docs', 'https://kotlinlang.org/docs/getting-started.html']]],
  [/jetpack compose|^android$/i, [['Android Developers courses', 'https://developer.android.com/courses']]],
  [/^swift$|swiftui|^ios$/i, [['SwiftUI tutorials', 'https://developer.apple.com/tutorials/swiftui'], ['Swift documentation', 'https://www.swift.org/documentation/']]],
  [/flutter|^dart$/i, [['Flutter docs', 'https://docs.flutter.dev/'], ['Dart language tour', 'https://dart.dev/language']]],
  [/^rust$/i, [['The Rust Book', 'https://doc.rust-lang.org/book/']]],
  [/laravel/i, [['Laravel docs', 'https://laravel.com/docs']]],
  [/^php$/i, [['PHP manual', 'https://www.php.net/manual/en/getting-started.php']]],
  [/^ruby$/i, [['Ruby quickstart', 'https://www.ruby-lang.org/en/documentation/quickstart/']]],
  [/^r$/i, [['R for Data Science', 'https://r4ds.hadley.nz/']]],
  [/^bash$|linux/i, [['The Linux Command Line', 'https://linuxcommand.org/tlcl.php']]],
  [/node\.?js|express/i, [['Node.js Learn', 'https://nodejs.org/en/learn'], ['Express guide', 'https://expressjs.com/en/guide/routing.html']]],
  [/spring|hibernate/i, [['Spring guides', 'https://spring.io/guides']]],
  [/django/i, [['Django tutorial', 'https://docs.djangoproject.com/en/stable/intro/tutorial01/']]],
  [/flask/i, [['Flask tutorial', 'https://flask.palletsprojects.com/en/stable/tutorial/']]],
  [/fastapi/i, [['FastAPI tutorial', 'https://fastapi.tiangolo.com/tutorial/']]],
  [/graphql/i, [['Learn GraphQL', 'https://graphql.org/learn/']]],
  [/postman|api testing/i, [['Postman Learning Center', 'https://learning.postman.com/']]],
  [/rest api|microservices/i, [['MDN: HTTP', 'https://developer.mozilla.org/en-US/docs/Web/HTTP'], ['microservices.io', 'https://microservices.io/']]],
  [/mongodb/i, [['MongoDB University', 'https://learn.mongodb.com/']]],
  [/sql|mysql|postgres|oracle/i, [['SQLBolt', 'https://sqlbolt.com/'], ['W3Schools SQL', 'https://www.w3schools.com/sql/']]],
  [/^aws$/i, [['AWS Skill Builder', 'https://skillbuilder.aws/']]],
  [/azure/i, [['Microsoft Learn: Azure', 'https://learn.microsoft.com/en-us/training/azure/']]],
  [/google cloud|gcp/i, [['Google Cloud Skills Boost', 'https://www.cloudskillsboost.google/']]],
  [/docker/i, [['Docker: Get started', 'https://docs.docker.com/get-started/']]],
  [/kubernetes/i, [['Kubernetes tutorials', 'https://kubernetes.io/docs/tutorials/']]],
  [/github actions|ci\/cd|jenkins/i, [['GitHub Actions docs', 'https://docs.github.com/en/actions'], ['Jenkins docs', 'https://www.jenkins.io/doc/']]],
  [/terraform/i, [['Terraform tutorials', 'https://developer.hashicorp.com/terraform/tutorials']]],
  [/^git$/i, [['Pro Git book', 'https://git-scm.com/book/en/v2']]],
  [/generative ai|llm/i, [['Hugging Face courses', 'https://huggingface.co/learn'], ['DeepLearning.AI short courses', 'https://www.deeplearning.ai/short-courses/']]],
  [/machine learning|deep learning|scikit|tensorflow|pytorch|nlp|computer vision/i, [['Google ML Crash Course', 'https://developers.google.com/machine-learning/crash-course'], ['Kaggle Learn', 'https://www.kaggle.com/learn']]],
  [/statistics/i, [['Khan Academy: Statistics', 'https://www.khanacademy.org/math/statistics-probability']]],
  [/data analysis|pandas|numpy|spark|data engineering/i, [['Kaggle Learn', 'https://www.kaggle.com/learn']]],
  [/power bi/i, [['Microsoft Learn: Power BI', 'https://learn.microsoft.com/en-us/training/powerplatform/power-bi']]],
  [/tableau/i, [['Tableau get-started tutorial', 'https://help.tableau.com/current/guides/get-started-tutorial/en-us/get-started-tutorial-home.htm']]],
  [/excel/i, [['Exceljet', 'https://exceljet.net/']]],
  [/selenium/i, [['Selenium docs', 'https://www.selenium.dev/documentation/']]],
  [/playwright/i, [['Playwright docs', 'https://playwright.dev/docs/intro']]],
  [/cypress/i, [['Cypress docs', 'https://docs.cypress.io/']]],
  [/jest/i, [['Jest: Getting started', 'https://jestjs.io/docs/getting-started']]],
  [/junit/i, [['JUnit 5 user guide', 'https://junit.org/junit5/docs/current/user-guide/']]],
  [/^oop$/i, [['GeeksforGeeks: OOP', 'https://www.geeksforgeeks.org/introduction-of-object-oriented-programming/']]],
  [/dbms/i, [['GeeksforGeeks: DBMS', 'https://www.geeksforgeeks.org/dbms/']]],
  [/operating systems/i, [['GeeksforGeeks: Operating systems', 'https://www.geeksforgeeks.org/operating-systems/']]],
  [/computer networks/i, [['GeeksforGeeks: Computer networks', 'https://www.geeksforgeeks.org/computer-network-tutorials/']]],
  [/system design/i, [['System Design Primer', 'https://github.com/donnemartin/system-design-primer']]],
  [/security|hacking|^soc$|^iam$/i, [['TryHackMe', 'https://tryhackme.com/'], ['OWASP Top 10', 'https://owasp.org/www-project-top-ten/']]],
  [/ui\/ux|figma/i, [['Figma Learn', 'https://help.figma.com/hc/en-us'], ['Google UX Design', 'https://www.coursera.org/professional-certificates/google-ux-design']]],
  [/agile|scrum|jira|product management|business analysis/i, [['Atlassian Agile Coach', 'https://www.atlassian.com/agile'], ['The Scrum Guide', 'https://scrumguides.org/scrum-guide.html']]],
  [/seo|digital marketing/i, [['Google Skillshop', 'https://skillshop.withgoogle.com/'], ['Google SEO starter guide', 'https://developers.google.com/search/docs/fundamentals/seo-starter-guide']]],
  [/^english$|communication/i, [['BBC Learning English', 'https://www.bbc.co.uk/learningenglish']]],
];

/**
 * Learning links for a skill: { viso: true } for DSA (opens Viso DSA), otherwise up to
 * three websites — the best-known free resource first, then video courses on YouTube.
 */
export function learnLinksFor(skill) {
  if (DSA.test(skill)) return { viso: true, links: [] };
  const found = LINKS.find(([re]) => re.test(skill.trim()))?.[1] || [
    ['Coursera', `https://www.coursera.org/search?query=${encodeURIComponent(skill)}`],
  ];
  const links = [...found, ['YouTube courses', `https://www.youtube.com/results?search_query=${encodeURIComponent(`${skill} full course`)}`]];
  return { viso: false, links: links.slice(0, 3).map(([name, url]) => ({ name, url })) };
}
