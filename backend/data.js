// O-Level Mauritius past paper catalogue.
//
// Zone 4 variant rules:
//   May/June:          Primary variant digit = 1 (codes: 11, 21, 31, 41)
//   October/November:  Primary variant digit = 2 (codes: 12, 22, 32, 42)
//
// For multi-variant papers, secondary variants follow in descending order.
// For single-variant regional papers (e.g. 1125 English, 3014 French,
// Asian languages, 2055 Hinduism), use only the primary component number
// (e.g. 11, 21 or Paper 01, 02).

const O_LEVEL_PAPERS = [
  // ---------------------------------------------------------------------------
  // Core standard subjects (Zone 4, multi-variant)
  // ---------------------------------------------------------------------------
  {
    code: "1123",
    name: "English Language",
    sessions: {
      "May/June": {
        papers: [
          { number: 1, name: "Paper 1 (Writing)", components: ["11", "12", "13"] },
          { number: 2, name: "Paper 2 (Reading)", components: ["21", "22", "23"] }
        ]
      },
      "October/November": {
        papers: [
          { number: 1, name: "Paper 1 (Writing)", components: ["12", "11"] },
          { number: 2, name: "Paper 2 (Reading)", components: ["22", "21"] }
        ]
      }
    }
  },
  {
    code: "2210",
    name: "Computer Science",
    sessions: {
      "May/June": {
        papers: [
          { number: 1, name: "Paper 1 (Theory)", components: ["11", "12", "13"] },
          { number: 2, name: "Paper 2 (Problem-Solving & Programming)", components: ["21", "22", "23"] }
        ]
      },
      "October/November": {
        papers: [
          { number: 1, name: "Paper 1 (Theory)", components: ["12"] },
          { number: 2, name: "Paper 2 (Problem-Solving & Programming)", components: ["22"] }
        ]
      }
    }
  },
  {
    code: "4024",
    name: "Mathematics (Syllabus D)",
    sessions: {
      "May/June": {
        papers: [
          { number: 1, name: "Paper 1 (Non-Calculator)", components: ["12", "13"] },
          { number: 2, name: "Paper 2 (Calculator)", components: ["22", "23"] }
        ]
      },
      "October/November": {
        papers: [
          { number: 1, name: "Paper 1 (Non-Calculator)", components: ["11", "12"] },
          { number: 2, name: "Paper 2 (Calculator)", components: ["21", "22"] }
        ]
      }
    }
  },
  {
    code: "4037",
    name: "Additional Mathematics",
    sessions: {
      "May/June": {
        papers: [
          { number: 1, name: "Paper 1", components: ["11", "12", "13"] },
          { number: 2, name: "Paper 2", components: ["21", "22", "23"] }
        ]
      },
      "October/November": {
        papers: [
          { number: 1, name: "Paper 1", components: ["12", "11"] },
          { number: 2, name: "Paper 2", components: ["22", "21"] }
        ]
      }
    }
  },
  {
    code: "5054",
    name: "Physics",
    sessions: {
      "May/June": {
        papers: [
          { number: 1, name: "Paper 1 (Multiple Choice)", components: ["11", "12", "13"] },
          { number: 2, name: "Paper 2 (Theory)", components: ["21", "22", "23"] },
          { number: 3, name: "Paper 3 (Practical Test)", components: ["31", "32"] },
          { number: 4, name: "Paper 4 (Alternative to Practical)", components: ["41", "42"] }
        ]
      },
      "October/November": {
        papers: [
          { number: 1, name: "Paper 1 (Multiple Choice)", components: ["12", "11"] },
          { number: 2, name: "Paper 2 (Theory)", components: ["22", "21"] },
          { number: 4, name: "Paper 4 (Alternative to Practical)", components: ["42", "41"] }
        ]
      }
    }
  },
  {
    code: "5070",
    name: "Chemistry",
    sessions: {
      "May/June": {
        papers: [
          { number: 1, name: "Paper 1 (Multiple Choice)", components: ["11", "12", "13"] },
          { number: 2, name: "Paper 2 (Theory)", components: ["21", "22", "23"] },
          { number: 3, name: "Paper 3 (Practical Test)", components: ["31", "32"] },
          { number: 4, name: "Paper 4 (Alternative to Practical)", components: ["41", "42"] }
        ]
      },
      "October/November": {
        papers: [
          { number: 1, name: "Paper 1 (Multiple Choice)", components: ["12", "11"] },
          { number: 2, name: "Paper 2 (Theory)", components: ["22", "21"] },
          { number: 4, name: "Paper 4 (Alternative to Practical)", components: ["42", "41"] }
        ]
      }
    }
  },
  {
    code: "5090",
    name: "Biology",
    sessions: {
      "May/June": {
        papers: [
          { number: 1, name: "Paper 1 (Multiple Choice)", components: ["11", "12", "13"] },
          { number: 2, name: "Paper 2 (Theory)", components: ["21", "22", "23"] },
          { number: 3, name: "Paper 3 (Practical Test)", components: ["31", "32"] },
          { number: 4, name: "Paper 4 (Alternative to Practical)", components: ["41", "42"] }
        ]
      },
      "October/November": {
        papers: [
          { number: 1, name: "Paper 1 (Multiple Choice)", components: ["12", "11"] },
          { number: 2, name: "Paper 2 (Theory)", components: ["22", "21"] },
          { number: 4, name: "Paper 4 (Alternative to Practical)", components: ["42", "41"] }
        ]
      }
    }
  },
  {
    code: "2281",
    name: "Economics",
    sessions: {
      "May/June": {
        papers: [
          { number: 1, name: "Paper 1 (Multiple Choice)", components: ["11", "12", "13"] },
          { number: 2, name: "Paper 2 (Structured)", components: ["21", "22", "23"] }
        ]
      },
      "October/November": {
        papers: [
          { number: 1, name: "Paper 1 (Multiple Choice)", components: ["12"] },
          { number: 2, name: "Paper 2 (Structured)", components: ["22"] }
        ]
      }
    }
  },
  {
    code: "7707",
    name: "Accounting",
    sessions: {
      "May/June": {
        papers: [
          { number: 1, name: "Paper 1 (Multiple Choice)", components: ["11", "12", "13"] },
          { number: 2, name: "Paper 2 (Structured)", components: ["21", "22", "23"] }
        ]
      },
      "October/November": {
        papers: [
          { number: 1, name: "Paper 1 (Multiple Choice)", components: ["12"] },
          { number: 2, name: "Paper 2 (Structured)", components: ["22"] }
        ]
      }
    }
  },
  {
    code: "2217",
    name: "Geography",
    sessions: {
      "May/June": {
        papers: [
          { number: 1, name: "Paper 1 (Physical Geography)", components: ["11", "12"] },
          { number: 2, name: "Paper 2 (Human Geography)", components: ["21", "22"] },
          { number: 3, name: "Paper 3 (Geographical Investigations)", components: ["31", "32"] }
        ]
      },
      "October/November": {
        papers: [
          { number: 1, name: "Paper 1 (Physical Geography)", components: ["12", "11"] },
          { number: 2, name: "Paper 2 (Human Geography)", components: ["22", "21"] },
          { number: 3, name: "Paper 3 (Geographical Investigations)", components: ["32", "31"] }
        ]
      }
    }
  },
  {
    code: "2251",
    name: "Sociology",
    sessions: {
      "May/June": {
        papers: [
          { number: 1, name: "Paper 1 (Research Methods, Identity and Inequality)", components: ["11", "12"] },
          { number: 2, name: "Paper 2 (Family, Education and Crime)", components: ["21", "22"] }
        ]
      },
      "October/November": {
        papers: [
          { number: 1, name: "Paper 1 (Research Methods, Identity and Inequality)", components: ["12", "11"] },
          { number: 2, name: "Paper 2 (Family, Education and Crime)", components: ["22", "21"] }
        ]
      }
    }
  },
  {
    code: "5014",
    name: "Environmental Management",
    sessions: {
      "May/June": {
        papers: [
          { number: 1, name: "Paper 1 (Principles of Environmental Management)", components: ["11", "12"] },
          { number: 2, name: "Paper 2 (Environmental Management in Context)", components: ["21", "22"] }
        ]
      },
      "October/November": {
        papers: [
          { number: 1, name: "Paper 1 (Principles of Environmental Management)", components: ["12", "11"] },
          { number: 2, name: "Paper 2 (Environmental Management in Context)", components: ["22", "21"] }
        ]
      }
    }
  },
  {
    code: "7115",
    name: "Business Studies",
    sessions: {
      "May/June": {
        papers: [
          { number: 1, name: "Paper 1 (Short Answer and Data Response)", components: ["11", "12"] },
          { number: 2, name: "Paper 2 (Case Study)", components: ["21", "22"] }
        ]
      },
      "October/November": {
        papers: [
          { number: 1, name: "Paper 1 (Short Answer and Data Response)", components: ["12", "11"] },
          { number: 2, name: "Paper 2 (Case Study)", components: ["22", "21"] }
        ]
      }
    }
  },
  {
    code: "2010",
    name: "Literature in English",
    sessions: {
      "May/June": {
        papers: [
          { number: 1, name: "Paper 1 (Poetry and Prose)", components: ["11", "12"] },
          { number: 2, name: "Paper 2 (Drama)", components: ["21", "22"] }
        ]
      },
      "October/November": {
        papers: [
          { number: 1, name: "Paper 1 (Poetry and Prose)", components: ["12", "11"] },
          { number: 2, name: "Paper 2 (Drama)", components: ["22", "21"] }
        ]
      }
    }
  },
  {
    code: "2147",
    name: "History",
    sessions: {
      "May/June": {
        papers: [
          { number: 1, name: "Paper 1 (Structured Questions)", components: ["11", "12"] },
          { number: 2, name: "Paper 2 (Document Questions)", components: ["21", "22"] }
        ]
      },
      "October/November": {
        papers: [
          { number: 1, name: "Paper 1 (Structured Questions)", components: ["12", "11"] },
          { number: 2, name: "Paper 2 (Document Questions)", components: ["22", "21"] }
        ]
      }
    }
  },
  {
    code: "4040",
    name: "Statistics",
    sessions: {
      "May/June": {
        papers: [
          { number: 1, name: "Paper 1", components: ["11", "12"] },
          { number: 2, name: "Paper 2", components: ["21", "22"] }
        ]
      },
      "October/November": {
        papers: [
          { number: 1, name: "Paper 1", components: ["12", "11"] },
          { number: 2, name: "Paper 2", components: ["22", "21"] }
        ]
      }
    }
  },
  {
    code: "5129",
    name: "Combined Science",
    sessions: {
      "May/June": {
        papers: [
          { number: 1, name: "Paper 1 (Multiple Choice)", components: ["11", "12"] },
          { number: 2, name: "Paper 2 (Theory)", components: ["21", "22"] },
          { number: 3, name: "Paper 3 (Practical Test)", components: ["31", "32"] }
        ]
      },
      "October/November": {
        papers: [
          { number: 1, name: "Paper 1 (Multiple Choice)", components: ["12", "11"] },
          { number: 2, name: "Paper 2 (Theory)", components: ["22", "21"] },
          { number: 3, name: "Paper 3 (Practical Test)", components: ["32", "31"] }
        ]
      }
    }
  },
  {
    code: "7100",
    name: "Commerce",
    sessions: {
      "May/June": {
        papers: [
          { number: 1, name: "Paper 1 (Short Answer and Data Response)", components: ["11", "12"] },
          { number: 2, name: "Paper 2 (Case Study)", components: ["21", "22"] }
        ]
      },
      "October/November": {
        papers: [
          { number: 1, name: "Paper 1 (Short Answer and Data Response)", components: ["12", "11"] },
          { number: 2, name: "Paper 2 (Case Study)", components: ["22", "21"] }
        ]
      }
    }
  },

  // ---------------------------------------------------------------------------
  // Additional core subjects (Zone 4, multi-variant)
  // ---------------------------------------------------------------------------
  {
    code: "0625",
    name: "Physics (IGCSE)",
    qualification: "IGCSE",
    sessions: {
      "May/June": {
        papers: [
          { number: 1, name: "Paper 1 (Multiple Choice)", components: ["11", "12", "13"] },
          { number: 2, name: "Paper 2 (Theory)", components: ["21", "22", "23"] },
          { number: 3, name: "Paper 3 (Extended Theory)", components: ["31", "32", "33"] },
          { number: 4, name: "Paper 4 (Extended Theory)", components: ["41", "42", "43"] },
          { number: 6, name: "Paper 6 (Alternative to Practical)", components: ["61", "62", "63"] }
        ]
      },
      "October/November": {
        papers: [
          { number: 1, name: "Paper 1 (Multiple Choice)", components: ["12", "11"] },
          { number: 2, name: "Paper 2 (Theory)", components: ["22", "21"] },
          { number: 3, name: "Paper 3 (Extended Theory)", components: ["32", "31"] },
          { number: 4, name: "Paper 4 (Extended Theory)", components: ["42", "41"] },
          { number: 6, name: "Paper 6 (Alternative to Practical)", components: ["62", "61"] }
        ]
      }
    }
  },
  {
    code: "0620",
    name: "Chemistry (IGCSE)",
    qualification: "IGCSE",
    sessions: {
      "May/June": {
        papers: [
          { number: 1, name: "Paper 1 (Multiple Choice)", components: ["11", "12", "13"] },
          { number: 2, name: "Paper 2 (Theory)", components: ["21", "22", "23"] },
          { number: 3, name: "Paper 3 (Extended Theory)", components: ["31", "32", "33"] },
          { number: 4, name: "Paper 4 (Extended Theory)", components: ["41", "42", "43"] },
          { number: 6, name: "Paper 6 (Alternative to Practical)", components: ["61", "62", "63"] }
        ]
      },
      "October/November": {
        papers: [
          { number: 1, name: "Paper 1 (Multiple Choice)", components: ["12", "11"] },
          { number: 2, name: "Paper 2 (Theory)", components: ["22", "21"] },
          { number: 3, name: "Paper 3 (Extended Theory)", components: ["32", "31"] },
          { number: 4, name: "Paper 4 (Extended Theory)", components: ["42", "41"] },
          { number: 6, name: "Paper 6 (Alternative to Practical)", components: ["62", "61"] }
        ]
      }
    }
  },
  {
    code: "0610",
    name: "Biology (IGCSE)",
    qualification: "IGCSE",
    sessions: {
      "May/June": {
        papers: [
          { number: 1, name: "Paper 1 (Multiple Choice)", components: ["11", "12", "13"] },
          { number: 2, name: "Paper 2 (Theory)", components: ["21", "22", "23"] },
          { number: 3, name: "Paper 3 (Extended Theory)", components: ["31", "32", "33"] },
          { number: 4, name: "Paper 4 (Extended Theory)", components: ["41", "42", "43"] },
          { number: 6, name: "Paper 6 (Alternative to Practical)", components: ["61", "62", "63"] }
        ]
      },
      "October/November": {
        papers: [
          { number: 1, name: "Paper 1 (Multiple Choice)", components: ["12", "11"] },
          { number: 2, name: "Paper 2 (Theory)", components: ["22", "21"] },
          { number: 3, name: "Paper 3 (Extended Theory)", components: ["32", "31"] },
          { number: 4, name: "Paper 4 (Extended Theory)", components: ["42", "41"] },
          { number: 6, name: "Paper 6 (Alternative to Practical)", components: ["62", "61"] }
        ]
      }
    }
  },
  {
    code: "0580",
    name: "Mathematics (IGCSE)",
    qualification: "IGCSE",
    sessions: {
      "May/June": {
        papers: [
          { number: 1, name: "Paper 1 (Core Multiple Choice)", components: ["11", "12", "13"] },
          { number: 2, name: "Paper 2 (Core Short Answer)", components: ["21", "22", "23"] },
          { number: 3, name: "Paper 3 (Extended Multiple Choice)", components: ["31", "32", "33"] },
          { number: 4, name: "Paper 4 (Extended Problem Solving)", components: ["41", "42", "43"] }
        ]
      },
      "October/November": {
        papers: [
          { number: 1, name: "Paper 1 (Core Multiple Choice)", components: ["12", "11"] },
          { number: 2, name: "Paper 2 (Core Short Answer)", components: ["22", "21"] },
          { number: 3, name: "Paper 3 (Extended Multiple Choice)", components: ["32", "31"] },
          { number: 4, name: "Paper 4 (Extended Problem Solving)", components: ["42", "41"] }
        ]
      }
    }
  },
  {
    code: "0510",
    name: "English as a Second Language (IGCSE)",
    qualification: "IGCSE",
    sessions: {
      "May/June": {
        papers: [
          { number: 1, name: "Paper 1 (Listening)", components: ["11"] },
          { number: 2, name: "Paper 2 (Reading & Writing)", components: ["21"] }
        ]
      },
      "October/November": {
        papers: [
          { number: 1, name: "Paper 1 (Listening)", components: ["11"] },
          { number: 2, name: "Paper 2 (Reading & Writing)", components: ["21"] }
        ]
      }
    }
  },
  {
    code: "0478",
    name: "Computer Science (IGCSE)",
    qualification: "IGCSE",
    sessions: {
      "May/June": {
        papers: [
          { number: 1, name: "Paper 1 (Theory)", components: ["11", "12"] },
          { number: 2, name: "Paper 2 (Problem-Solving & Programming)", components: ["21", "22"] }
        ]
      },
      "October/November": {
        papers: [
          { number: 1, name: "Paper 1 (Theory)", components: ["12", "11"] },
          { number: 2, name: "Paper 2 (Problem-Solving & Programming)", components: ["22", "21"] }
        ]
      }
    }
  },
  {
    code: "0460",
    name: "Geography (IGCSE)",
    qualification: "IGCSE",
    sessions: {
      "May/June": {
        papers: [
          { number: 1, name: "Paper 1 (Core Geography)", components: ["11", "12"] },
          { number: 2, name: "Paper 2 (Extended Geography)", components: ["21", "22"] }
        ]
      },
      "October/November": {
        papers: [
          { number: 1, name: "Paper 1 (Core Geography)", components: ["12", "11"] },
          { number: 2, name: "Paper 2 (Extended Geography)", components: ["22", "21"] }
        ]
      }
    }
  },
  {
    code: "0470",
    name: "History (IGCSE)",
    qualification: "IGCSE",
    sessions: {
      "May/June": {
        papers: [
          { number: 1, name: "Paper 1 (Core)", components: ["11", "12"] },
          { number: 2, name: "Paper 2 (Extended)", components: ["21", "22"] }
        ]
      },
      "October/November": {
        papers: [
          { number: 1, name: "Paper 1 (Core)", components: ["12", "11"] },
          { number: 2, name: "Paper 2 (Extended)", components: ["22", "21"] }
        ]
      }
    }
  },
  {
    code: "0455",
    name: "Economics (IGCSE)",
    qualification: "IGCSE",
    sessions: {
      "May/June": {
        papers: [
          { number: 1, name: "Paper 1 (Multiple Choice)", components: ["11", "12"] },
          { number: 2, name: "Paper 2 (Theory)", components: ["21", "22"] }
        ]
      },
      "October/November": {
        papers: [
          { number: 1, name: "Paper 1 (Multiple Choice)", components: ["12", "11"] },
          { number: 2, name: "Paper 2 (Theory)", components: ["22", "21"] }
        ]
      }
    }
  },
  {
    code: "0450",
    name: "Business Studies (IGCSE)",
    qualification: "IGCSE",
    sessions: {
      "May/June": {
        papers: [
          { number: 1, name: "Paper 1 (Short Answer & Data Response)", components: ["11", "12"] },
          { number: 2, name: "Paper 2 (Case Study)", components: ["21", "22"] }
        ]
      },
      "October/November": {
        papers: [
          { number: 1, name: "Paper 1 (Short Answer & Data Response)", components: ["12", "11"] },
          { number: 2, name: "Paper 2 (Case Study)", components: ["22", "21"] }
        ]
      }
    }
  },
  {
    code: "0452",
    name: "Accounting (IGCSE)",
    qualification: "IGCSE",
    sessions: {
      "May/June": {
        papers: [
          { number: 1, name: "Paper 1 (Multiple Choice)", components: ["11", "12"] },
          { number: 2, name: "Paper 2 (Theory)", components: ["21", "22"] }
        ]
      },
      "October/November": {
        papers: [
          { number: 1, name: "Paper 1 (Multiple Choice)", components: ["12", "11"] },
          { number: 2, name: "Paper 2 (Theory)", components: ["22", "21"] }
        ]
      }
    }
  },
  {
    code: "2068",
    name: "Islamic Religious Studies",
    qualification: "O Level",
    sessions: {
      "May/June": {
        papers: [
          { number: 1, name: "Paper 1", components: ["11"] },
          { number: 2, name: "Paper 2", components: ["21"] }
        ]
      },
      "October/November": {
        papers: [
          { number: 1, name: "Paper 1", components: ["11"] },
          { number: 2, name: "Paper 2", components: ["21"] }
        ]
      }
    }
  },

  // ---------------------------------------------------------------------------
  // Mauritius-specific regional subjects (single-variant, fixed component numbers)
  // ---------------------------------------------------------------------------
  {
    code: "1125",
    name: "English Language (Mauritius)",
    sessions: {
      "May/June": {
        papers: [
          { number: 1, name: "Paper 1 (Writing)", components: ["11"] },
          { number: 2, name: "Paper 2 (Reading)", components: ["21"] }
        ]
      },
      "October/November": {
        papers: [
          { number: 1, name: "Paper 1 (Writing)", components: ["11"] },
          { number: 2, name: "Paper 2 (Reading)", components: ["21"] }
        ]
      }
    }
  },
  {
    code: "3014",
    name: "French",
    sessions: {
      "May/June": {
        papers: [
          { number: 1, name: "Paper 1", components: ["11"] },
          { number: 2, name: "Paper 2", components: ["21"] }
        ]
      },
      "October/November": {
        papers: [
          { number: 1, name: "Paper 1", components: ["11"] },
          { number: 2, name: "Paper 2", components: ["21"] }
        ]
      }
    }
  },
  {
    code: "2162",
    name: "History (Mauritius and Modern World Affairs)",
    sessions: {
      "May/June": {
        papers: [
          { number: 1, name: "Paper 1 (Structured Questions)", components: ["11"] },
          { number: 2, name: "Paper 2 (Document Questions)", components: ["21"] }
        ]
      },
      "October/November": {
        papers: [
          { number: 1, name: "Paper 1 (Structured Questions)", components: ["11"] },
          { number: 2, name: "Paper 2 (Document Questions)", components: ["21"] }
        ]
      }
    }
  },
  {
    code: "2055",
    name: "Hinduism",
    sessions: {
      "May/June": {
        papers: [
          { number: 1, name: "Paper 1", components: ["11"] },
          { number: 2, name: "Paper 2", components: ["21"] }
        ]
      },
      "October/November": {
        papers: [
          { number: 1, name: "Paper 1", components: ["11"] },
          { number: 2, name: "Paper 2", components: ["21"] }
        ]
      }
    }
  },
  {
    code: "3201",
    name: "Hindi",
    sessions: {
      "May/June": {
        papers: [
          { number: 1, name: "Paper 1", components: ["11"] },
          { number: 2, name: "Paper 2", components: ["21"] }
        ]
      },
      "October/November": {
        papers: [
          { number: 1, name: "Paper 1", components: ["11"] },
          { number: 2, name: "Paper 2", components: ["21"] }
        ]
      }
    }
  },
  {
    code: "3206",
    name: "Tamil",
    sessions: {
      "May/June": {
        papers: [
          { number: 1, name: "Paper 1", components: ["11"] },
          { number: 2, name: "Paper 2", components: ["21"] }
        ]
      },
      "October/November": {
        papers: [
          { number: 1, name: "Paper 1", components: ["11"] },
          { number: 2, name: "Paper 2", components: ["21"] }
        ]
      }
    }
  },
  {
    code: "3209",
    name: "Urdu",
    sessions: {
      "May/June": {
        papers: [
          { number: 1, name: "Paper 1", components: ["11"] },
          { number: 2, name: "Paper 2", components: ["21"] }
        ]
      },
      "October/November": {
        papers: [
          { number: 1, name: "Paper 1", components: ["11"] },
          { number: 2, name: "Paper 2", components: ["21"] }
        ]
      }
    }
  },
  {
    code: "3218",
    name: "Marathi",
    sessions: {
      "May/June": {
        papers: [
          { number: 1, name: "Paper 1", components: ["11"] },
          { number: 2, name: "Paper 2", components: ["21"] }
        ]
      },
      "October/November": {
        papers: [
          { number: 1, name: "Paper 1", components: ["11"] },
          { number: 2, name: "Paper 2", components: ["21"] }
        ]
      }
    }
  },
  {
    code: "3252",
    name: "Modern Standard Chinese",
    sessions: {
      "May/June": {
        papers: [
          { number: 1, name: "Paper 1", components: ["11"] },
          { number: 2, name: "Paper 2", components: ["21"] }
        ]
      },
      "October/November": {
        papers: [
          { number: 1, name: "Paper 1", components: ["11"] },
          { number: 2, name: "Paper 2", components: ["21"] }
        ]
      }
    }
  },
  {
    code: "3180",
    name: "Arabic",
    sessions: {
      "May/June": {
        papers: [
          { number: 1, name: "Paper 1", components: ["11"] },
          { number: 2, name: "Paper 2", components: ["21"] }
        ]
      },
      "October/November": {
        papers: [
          { number: 1, name: "Paper 1", components: ["11"] },
          { number: 2, name: "Paper 2", components: ["21"] }
        ]
      }
    }
  },
  {
    code: "5016",
    name: "Physical Education",
    sessions: {
      "May/June": {
        papers: [
          { number: 1, name: "Paper 1 (Theory)", components: ["11"] },
          { number: 2, name: "Paper 2 (Coursework)", components: ["21"] }
        ]
      },
      "October/November": {
        papers: [
          { number: 1, name: "Paper 1 (Theory)", components: ["11"] },
          { number: 2, name: "Paper 2 (Coursework)", components: ["21"] }
        ]
      }
    }
  },
  {
    code: "6065",
    name: "Food & Nutrition",
    sessions: {
      "May/June": {
        papers: [
          { number: 1, name: "Paper 1 (Theory)", components: ["11"] },
          { number: 2, name: "Paper 2 (Practical Test)", components: ["21"] }
        ]
      },
      "October/November": {
        papers: [
          { number: 1, name: "Paper 1 (Theory)", components: ["11"] },
          { number: 2, name: "Paper 2 (Practical Test)", components: ["21"] }
        ]
      }
    }
  },
  {
    code: "6090",
    name: "Art & Design",
    sessions: {
      "May/June": {
        papers: [
          { number: 1, name: "Paper 1 (Coursework)", components: ["11"] },
          { number: 2, name: "Paper 2 (Controlled Test)", components: ["21"] }
        ]
      },
      "October/November": {
        papers: [
          { number: 1, name: "Paper 1 (Coursework)", components: ["11"] },
          { number: 2, name: "Paper 2 (Controlled Test)", components: ["21"] }
        ]
      }
    }
  },
  {
    code: "5038",
    name: "Agriculture",
    sessions: {
      "May/June": {
        papers: [
          { number: 1, name: "Paper 1 (Theory)", components: ["11"] },
          { number: 2, name: "Paper 2 (Practical Test)", components: ["21"] }
        ]
      },
      "October/November": {
        papers: [
          { number: 1, name: "Paper 1 (Theory)", components: ["11"] },
          { number: 2, name: "Paper 2 (Practical Test)", components: ["21"] }
        ]
      }
    }
  },
  {
    code: "6043",
    name: "Design & Technology",
    sessions: {
      "May/June": {
        papers: [
          { number: 1, name: "Paper 1 (Design)", components: ["11"] },
          { number: 2, name: "Paper 2 (Project/Coursework)", components: ["21"] }
        ]
      },
      "October/November": {
        papers: [
          { number: 1, name: "Paper 1 (Design)", components: ["11"] },
          { number: 2, name: "Paper 2 (Project/Coursework)", components: ["21"] }
        ]
      }
    }
  },
  {
    code: "4054",
    name: "Enterprise",
    sessions: {
      "May/June": {
        papers: [
          { number: 1, name: "Paper 1 (Short Answer and Data Response)", components: ["11"] },
          { number: 2, name: "Paper 2 (Case Study)", components: ["21"] }
        ]
      },
      "October/November": {
        papers: [
          { number: 1, name: "Paper 1 (Short Answer and Data Response)", components: ["11"] },
          { number: 2, name: "Paper 2 (Case Study)", components: ["21"] }
        ]
      }
    }
  }
];

const YEARS = [2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026];

function sessionToCode(session) {
  return session === "May/June" ? "mj" : "on";
}

function sessionSeries(year, session) {
  const prefix = session === "May/June" ? "s" : "w";
  const yy = String(year).slice(2);
  return `${prefix}${yy}`;
}

function inferPaperType(paperName) {
  const lower = paperName.toLowerCase();
  if (lower.includes("practical test")) return "practical";
  if (lower.includes("alternative to practical")) return "alternative_to_practical";
  if (lower.includes("coursework")) return "coursework";
  if (lower.includes("oral")) return "oral";
  if (lower.includes("listening")) return "listening";
  return "theory";
}

module.exports = {
  O_LEVEL_PAPERS,
  YEARS,
  sessionToCode,
  sessionSeries,
  inferPaperType,
};
