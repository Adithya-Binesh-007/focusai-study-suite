export type EducationLevel = "school" | "higher_secondary" | "college";
export type Difficulty = "easy" | "medium" | "hard";
export type Stream = "science" | "commerce" | "humanities";

export interface QuizConfig {
  educationLevel: EducationLevel;
  classOrYear: string;
  stream?: Stream;
  branch?: string;
  subject: string;
  difficulty: Difficulty;
}

export const educationLevels: { value: EducationLevel; label: string; description: string }[] = [
  { value: "school", label: "School (Class 1–10)", description: "Standard school curriculum" },
  { value: "higher_secondary", label: "Class 11 & 12", description: "Higher secondary with streams" },
  { value: "college", label: "B.Tech (College)", description: "Engineering undergraduate" },
];

export const schoolClasses = Array.from({ length: 10 }, (_, i) => ({
  value: `${i + 1}`,
  label: `Class ${i + 1}`,
}));

export const higherSecondaryClasses = [
  { value: "11", label: "Class 11" },
  { value: "12", label: "Class 12" },
];

export const streams: { value: Stream; label: string }[] = [
  { value: "science", label: "Science" },
  { value: "commerce", label: "Commerce" },
  { value: "humanities", label: "Humanities" },
];

export const collegeYears = [
  { value: "1", label: "1st Year" },
  { value: "2", label: "2nd Year" },
  { value: "3", label: "3rd Year" },
  { value: "4", label: "4th Year" },
];

export const btechBranches = [
  { value: "cse", label: "Computer Science & Engineering" },
  { value: "aiml", label: "AI & Machine Learning" },
  { value: "ece", label: "Electronics & Communication" },
  { value: "eee", label: "Electrical & Electronics" },
  { value: "mech", label: "Mechanical Engineering" },
  { value: "civil", label: "Civil Engineering" },
];

export const difficultyLevels: { value: Difficulty; label: string; description: string; questions: number; time: number }[] = [
  { value: "easy", label: "Easy", description: "Class test / fundamentals", questions: 10, time: 10 },
  { value: "medium", label: "Medium", description: "Mid-term / series exam level", questions: 25, time: 30 },
  { value: "hard", label: "Hard", description: "Board / university exam level", questions: 40, time: 60 },
];

// Subjects by education level
const primarySubjects = ["Mathematics", "English", "Science", "Social Studies", "Hindi", "Environmental Studies"];
const middleSubjects = ["Mathematics", "English", "Science", "Social Studies", "Hindi", "Computer Science"];
const highSubjects = ["Mathematics", "English", "Science", "Social Studies", "Hindi", "Computer Science", "Physics", "Chemistry", "Biology"];

const scienceSubjects11_12 = ["Physics", "Chemistry", "Mathematics", "Biology", "Computer Science", "English"];
const commerceSubjects11_12 = ["Accountancy", "Business Studies", "Economics", "Mathematics", "English"];
const humanitiesSubjects11_12 = ["History", "Political Science", "Geography", "Psychology", "Sociology", "English", "Economics"];

// B.Tech subjects by branch and year
const btechCommonYear1 = ["Engineering Mathematics I", "Engineering Mathematics II", "Engineering Physics", "Engineering Chemistry", "Programming in C", "English Communication"];

const btechSubjects: Record<string, Record<string, string[]>> = {
  cse: {
    "1": btechCommonYear1,
    "2": ["Data Structures", "Database Management Systems", "Object Oriented Programming", "Discrete Mathematics", "Computer Organization", "Operating Systems"],
    "3": ["Design & Analysis of Algorithms", "Computer Networks", "Software Engineering", "Machine Learning", "Compiler Design", "Theory of Computation"],
    "4": ["Artificial Intelligence", "Cloud Computing", "Cyber Security", "Big Data Analytics", "Internet of Things", "Mobile Computing"],
  },
  aiml: {
    "1": btechCommonYear1,
    "2": ["Data Structures", "Probability & Statistics", "Python Programming", "Linear Algebra", "Database Management Systems", "Object Oriented Programming"],
    "3": ["Machine Learning", "Deep Learning", "Natural Language Processing", "Computer Vision", "Data Mining", "Design & Analysis of Algorithms"],
    "4": ["Reinforcement Learning", "Generative AI", "MLOps", "AI Ethics", "Advanced Deep Learning", "Robotics & AI"],
  },
  ece: {
    "1": btechCommonYear1,
    "2": ["Electronic Devices & Circuits", "Signals & Systems", "Digital Electronics", "Network Theory", "Electromagnetic Theory", "Analog Electronics"],
    "3": ["Communication Systems", "Microprocessors", "Control Systems", "VLSI Design", "Digital Signal Processing", "Antenna & Wave Propagation"],
    "4": ["Wireless Communication", "Embedded Systems", "Optical Communication", "Satellite Communication", "Radar Engineering", "IoT & Sensors"],
  },
  eee: {
    "1": btechCommonYear1,
    "2": ["Electrical Circuit Analysis", "Electrical Machines I", "Electromagnetic Fields", "Electronic Devices", "Signals & Systems", "Digital Electronics"],
    "3": ["Power Systems", "Control Systems", "Electrical Machines II", "Power Electronics", "Microprocessors", "Instrumentation"],
    "4": ["High Voltage Engineering", "Renewable Energy Systems", "Smart Grid", "Electric Drives", "Power System Protection", "Industrial Automation"],
  },
  mech: {
    "1": btechCommonYear1,
    "2": ["Engineering Mechanics", "Thermodynamics", "Fluid Mechanics", "Strength of Materials", "Manufacturing Technology", "Engineering Drawing"],
    "3": ["Heat Transfer", "Machine Design", "Dynamics of Machinery", "Industrial Engineering", "Automobile Engineering", "Hydraulic Machines"],
    "4": ["CAD/CAM", "Finite Element Analysis", "Refrigeration & Air Conditioning", "Robotics", "Power Plant Engineering", "Renewable Energy"],
  },
  civil: {
    "1": btechCommonYear1,
    "2": ["Surveying", "Strength of Materials", "Fluid Mechanics", "Building Materials", "Engineering Geology", "Structural Analysis I"],
    "3": ["Structural Analysis II", "Geotechnical Engineering", "Transportation Engineering", "Environmental Engineering", "Concrete Technology", "Hydrology"],
    "4": ["Design of Steel Structures", "Design of RC Structures", "Construction Management", "Earthquake Engineering", "Remote Sensing & GIS", "Bridge Engineering"],
  },
};

export const getSubjects = (config: Partial<QuizConfig>): string[] => {
  const { educationLevel, classOrYear, stream, branch } = config;

  if (educationLevel === "school") {
    const cls = parseInt(classOrYear || "1");
    if (cls <= 5) return primarySubjects;
    if (cls <= 8) return middleSubjects;
    return highSubjects;
  }

  if (educationLevel === "higher_secondary") {
    if (stream === "science") return scienceSubjects11_12;
    if (stream === "commerce") return commerceSubjects11_12;
    if (stream === "humanities") return humanitiesSubjects11_12;
    return [];
  }

  if (educationLevel === "college" && branch && classOrYear) {
    return btechSubjects[branch]?.[classOrYear] || btechCommonYear1;
  }

  return [];
};

export const getDifficultyContext = (config: QuizConfig): string => {
  const { educationLevel, difficulty, classOrYear } = config;

  if (educationLevel === "school") {
    const cls = parseInt(classOrYear || "1");
    if (difficulty === "easy") return "simple class test with basic recall questions";
    if (difficulty === "medium") return "mid-term exam (40-60 marks) with application-based questions";
    // Hard: only class 10 gets "board exam level", rest get "difficult level"
    if (cls === 10) return "board exam level with analytical and higher-order thinking questions";
    return "difficult level with analytical and higher-order thinking questions";
  }

  if (educationLevel === "higher_secondary") {
    const cls = parseInt(classOrYear || "11");
    if (difficulty === "easy") return "simple class test with basic conceptual questions";
    if (difficulty === "medium") return "mid-term/series exam (40-60 marks) with moderate difficulty";
    // Hard: class 11 = model/entrance, class 12 = board exam
    if (cls === 11) return "model exam and entrance exam level questions for competitive preparation";
    return "board exam level questions including previous year board exam patterns";
  }

  // college
  if (difficulty === "easy") return "easy fundamental questions testing basic understanding";
  if (difficulty === "medium") return "series/internal exam level questions with moderate complexity";
  return "university exam level with tough application-based and analytical questions, refer to KTU/university exam patterns";
};
