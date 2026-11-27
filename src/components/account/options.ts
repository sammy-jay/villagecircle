/** Option lists shared by the sign-up and profile boards. */
export const NG_STATES = ["Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno", "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT Abuja", "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara"];
export const US_STATES = ["Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware", "District of Columbia", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming"];
export const UK_REGIONS = ["East Midlands", "East of England", "London", "North East England", "North West England", "South East England", "South West England", "West Midlands", "Yorkshire and the Humber", "Scotland", "Wales", "Northern Ireland"];
/** Sign-up countries for now: the three with a state list, plus everyone else. */
export const SIGNUP_COUNTRIES = ["Nigeria", "United Kingdom", "United States", "Others"];
/** The state or region list for a country, or null when the person types their own. */
export const regionsFor = (country?: string | null) => (country === "Nigeria" ? NG_STATES : country === "United Kingdom" ? UK_REGIONS : country === "United States" ? US_STATES : null);
export const COUNTRIES = ["Nigeria", "Ghana", "Kenya", "South Africa", "United Kingdom", "United States", "Canada", "Other"];
export const HEARD_FROM = ["A teacher or school", "At school or church", "A friend or family member", "A mentor", "Social media", "An event", "Other"];
export const RELATIONSHIPS = ["Parent", "Guardian", "Grandparent", "Aunt or uncle", "Older sibling", "Other relative"];
export const STAGES: [string, string][] = [["HIGH_SCHOOL", "Secondary school (Grade 7 to Grade 12)"], ["COLLEGE", "University or polytechnic"], ["GRADUATE", "Finished studying, looking for work"], ["EARLY_CAREER", "Working"], ["OTHER", "Something else"]];
export const INTERESTS = ["Careers", "University and courses", "Internships", "CVs", "Interviews", "Starting a business", "Leadership", "Money skills", "Wellbeing", "Study skills", "Tech", "Medicine and health", "Law", "Creative work", "Studying abroad"];
export const GOALS = ["Choose a course or university", "Get my first job", "Find an internship", "Start a business", "Prepare for exams", "Figure out what I want", "Something else"];
export const BACKGROUNDS = ["First in my family to go to college", "Rural or small town", "Single-parent home", "Migrant or relocated", "Neurodivergent", "Disability", "Refugee background", "Prefer not to say", "Other"];
export const LANGUAGES = ["English", "Yoruba", "Igbo", "Hausa", "Pidgin", "French", "Other"];
/** Community background is stored as one string: "Choice; Choice: say more". These read and write it. */
export const BACKGROUND_EXCLUSIVE = ["Prefer not to say"];
export function parseBackground(raw: string | null | undefined): { picks: string[]; more: string } {
  const s = raw ?? ""; const i = s.indexOf(": ");
  const head = i < 0 ? s : s.slice(0, i);
  return { picks: head.split("; ").map((x) => x.trim()).filter((x) => BACKGROUNDS.includes(x)), more: i < 0 ? "" : s.slice(i + 2) };
}
export function formatBackground(picks: string[], more: string): string {
  const head = Array.from(new Set(picks.filter((p) => BACKGROUNDS.includes(p))));
  const tail = more.trim();
  return head.length ? (tail ? `${head.join("; ")}: ${tail}` : head.join("; ")) : tail ? `Other: ${tail}` : "";
}
export const opts = (xs: string[]) => xs.map((x) => ({ value: x, label: x }));

/* Mentor sign-up (DK7 / DK8, M5 / M6) */
export const MENTOR_AREAS = ["Careers", "School and exams", "Money", "Starting something", "Wellbeing", "Life after school", "Tech", "Health", "Law", "Arts"];
export const SENIORITY = ["Early career", "Mid-career", "Senior professional", "Leader or executive", "Business owner", "Retired"];
export const EXPERIENCE_YEARS = ["Under 3 years", "3 to 5 years", "5 to 10 years", "10 to 15 years", "Over 15 years"];
export const TIME_ZONES = ["West Africa Time (WAT), UTC+1", "Greenwich Mean Time (GMT), UTC+0", "Central Africa Time (CAT), UTC+2", "East Africa Time (EAT), UTC+3", "UK time (GMT/BST)", "Central European Time, UTC+1", "Eastern Time (US), UTC-5", "Central Time (US), UTC-6", "Pacific Time (US), UTC-8", "Other"];
export const MENTOR_HEARD = ["A friend or colleague", "My employer", "A professional body", "Social media", "An event", "A young person I know", "Other"];
export const MONTHLY_HOURS = [["1", "1 hour (One Hour Challenge)"], ["2", "2 hours"], ["3", "3 hours"], ["4", "4 hours"], ["6", "6 hours"], ["8", "8 hours"]] as const;
