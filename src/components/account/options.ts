/** Option lists shared by the sign-up and profile boards. */
export const NG_STATES = ["Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno", "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT Abuja", "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara", "Outside Nigeria"];
export const COUNTRIES = ["Nigeria", "Ghana", "Kenya", "South Africa", "United Kingdom", "United States", "Canada", "Other"];
export const HEARD_FROM = ["A teacher or school", "At school or church", "A friend or family member", "A mentor", "Social media", "An event", "Other"];
export const RELATIONSHIPS = ["Parent", "Guardian", "Grandparent", "Aunt or uncle", "Older sibling", "Other relative"];
export const STAGES: [string, string][] = [["HIGH_SCHOOL", "Secondary school (JSS1 to SS3)"], ["COLLEGE", "University or polytechnic"], ["GRADUATE", "Finished studying, looking for work"], ["EARLY_CAREER", "Working"], ["OTHER", "Something else"]];
export const INTERESTS = ["Careers", "University and courses", "Internships", "CVs", "Interviews", "Starting a business", "Leadership", "Money skills", "Wellbeing", "Study skills", "Tech", "Medicine and health", "Law", "Creative work", "Studying abroad"];
export const GOALS = ["Choose a course or university", "Get my first job", "Find an internship", "Start a business", "Prepare for exams", "Figure out what I want", "Something else"];
export const BACKGROUNDS = ["First in my family to go to college", "Rural or small town", "Single-parent home", "Migrant or relocated", "Neurodivergent", "Disability", "Refugee background", "Prefer not to say", "Other"];
export const LANGUAGES = ["English", "Yoruba", "Igbo", "Hausa", "Pidgin", "French", "Other"];
export const opts = (xs: string[]) => xs.map((x) => ({ value: x, label: x }));
