import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface QuestionGenerationParams {
  type: "objective" | "fill_in_the_blanks" | "theory" | "practical";
  topic: string;
  difficulty: "easy" | "medium" | "hard";
  count: number;
}

// Mock function for now, will integrate with actual AI later
export async function generateQuestionsWithAI({
  type,
  topic,
  difficulty,
  count,
}: QuestionGenerationParams) {
  const t = topic.trim().toLowerCase();
  const slug = t.replace(/[^a-z0-9]+/g, '-');
  const desired = type === 'objective' ? 'mcq' : (type === 'fill_in_the_blanks' ? 'theory' : type);
  const useLLM = !!process.env.OPENAI_API_KEY;
  function shuffle<T>(arr: T[]) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  }
  if (useLLM) {
    try {
      const prompt = `
You are an expert GES curriculum question generator for Basic 7 ICT.

Generate EXACTLY ${count} questions for the topic:
"${topic}"

Follow GES SBC (Standard-Based Curriculum) style.

Your output MUST be STRICT JSON (no explanations, no markdown, no comments).

Each question object must have this exact format:

{
  "id": "unique string",
  "grade": 7,
  "topic": "",
  "type": "mcq" | "theory" | "practical",
  "stem": "",
  "options": [
      {"id":"o1", "text":""},
      {"id":"o2", "text":""},
      {"id":"o3", "text":""},
      {"id":"o4", "text":""}
  ],
  "correctOptions": ["o1"],
  "marks": 1,
  "diagram": null
}


Rules:
- MCQs MUST have 4 options.
- Theory and Practical questions MUST set "options": null and "correctOptions": null.
- "diagram" can be null OR { "instruction": "Draw a computer mouse" }.
- Questions MUST be Basic 7 level.
- Use simple wording.
- Do NOT number the questions.
- At least 30% of questions should be scenario/story form that require logic.
- Output ONLY a JSON array.
`;
      const resp = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0,
      });
      const content = resp.choices?.[0]?.message?.content || '[]';
      const raw = JSON.parse(content);
      const filtered = Array.isArray(raw) ? raw.filter((q: any) => (q?.type || '').toLowerCase() === desired) : [];
      const list = filtered.slice(0, count);
      if (list.length > 0) {
        return list.map((q: any, i: number) => {
          const opts = Array.isArray(q.options) ? q.options : [];
          const correctId = Array.isArray(q.correctOptions) ? q.correctOptions[0] : undefined;
          const answerText = correctId ? (opts.find((o: any) => o.id === correctId)?.text || undefined) : undefined;
          const optTexts = type === 'fill_in_the_blanks' ? undefined : (desired === 'mcq' ? opts.map((o: any) => o.text) : undefined);
          const shuffled = Array.isArray(optTexts) ? shuffle(optTexts) : undefined;
          return {
            id: q.id || `${slug}-${desired}-${i + 1}`,
            question: q.stem || '',
            type: type === 'fill_in_the_blanks' ? 'fill_in_the_blanks' : (desired === 'mcq' ? 'objective' : desired),
            options: shuffled,
            answer: type === 'fill_in_the_blanks' ? undefined : (desired === 'mcq' ? answerText : undefined),
            diagram: q.diagram || null,
          };
        });
      }
    } catch {}
  }
  function mcq(q: string, opts: string[]) {
    return { question: q, options: opts, answer: opts[0] };
  }
  function theory(q: string) {
    return { question: q };
  }
  function practical(q: string) {
    return { question: q };
  }
  const banks: Record<string, { objective: ReturnType<typeof mcq>[]; theory: ReturnType<typeof theory>[]; practical: ReturnType<typeof practical>[] }> = {
    'components-of-computers-and-computer-systems': {
      objective: [
        mcq('Which part is responsible for executing instructions?', ['CPU', 'Monitor', 'Keyboard', 'Printer']),
        mcq('Which is an input device?', ['Mouse', 'Speaker', 'Projector', 'CPU Fan']),
        mcq('Primary storage of a computer is called?', ['RAM', 'SSD', 'HDD', 'USB']),
        mcq('Which component displays output?', ['Monitor', 'Microphone', 'Keyboard', 'Scanner']),
        mcq('Which port is commonly used for keyboards and mice today?', ['USB', 'VGA', 'HDMI', 'PS/2']),
        mcq('Which stores data permanently?', ['SSD', 'RAM', 'Cache', 'Registers']),
        mcq('A computer system is a combination of?', ['Hardware and software', 'Hardware only', 'Software only', 'Mouse and keyboard']),
        mcq('Which device converts hard copy to soft copy?', ['Scanner', 'Printer', 'Monitor', 'Speaker']),
        mcq('Which component manages all activities?', ['CPU', 'GPU', 'PSU', 'NIC']),
        mcq('Operating System is a type of?', ['System software', 'Application software', 'Hardware', 'Peripheral']),
      ],
      theory: [
        theory('Explain the functions of the CPU and RAM.'),
        theory('Describe three output devices and their uses.'),
        theory('Differentiate between primary and secondary storage.'),
        theory('Explain the role of an Operating System in a computer system.'),
        theory('List and explain components needed to build a basic computer.'),
      ],
      practical: [
        practical('Identify hardware components from images and classify them.'),
        practical('Assemble a simple computer setup and label parts.'),
        practical('Demonstrate connecting input devices to a system.'),
        practical('Install a simple OS in a virtual environment and note steps.'),
        practical('Measure boot time differences between HDD and SSD.'),
      ],
    },
    'technology-in-the-community': {
      objective: [
        mcq('Which technology improves communication speed?', ['Internet', 'Chalkboard', 'Typewriter', 'Abacus']),
        mcq('E-banking refers to?', ['Online banking', 'Banking in a bus', 'Banking with coins', 'Paper banking']),
        mcq('Telemedicine helps with?', ['Remote healthcare', 'Agricultural pricing', 'Music mixing', 'Video games']),
        mcq('ICT tools used in education include?', ['Projector', 'Hoe', 'Hammer', 'Sewing machine']),
        mcq('A positive impact of technology is?', ['Access to information', 'More pollution', 'Less accuracy', 'Slower processing']),
      ],
      theory: [
        theory('Discuss two positive and two negative impacts of technology in communities.'),
        theory('Explain how ICT has transformed education in your area.'),
        theory('Describe how mobile money works and its benefits.'),
        theory('Discuss how technology supports health services in rural areas.'),
        theory('Explain the role of social media in community development.'),
      ],
      practical: [
        practical('Create a poster showing safe technology use in your community.'),
        practical('Conduct a survey on technology usage and present findings.'),
        practical('Demonstrate sending an email with attachments.'),
        practical('Prepare a slide showcasing ICT benefits for local schools.'),
        practical('Record a short tutorial on using mobile money safely.'),
      ],
    },
    'health-and-safety-in-using-ict-tools': {
      objective: [
        mcq('Which posture reduces strain during computer use?', ['Straight back, eyes level', 'Bent neck, slouching', 'Standing on one leg', 'Lying down']),
        mcq('Breaks during screen time should be taken every?', ['20–30 minutes', '2 hours', '5 minutes', 'Immediately']),
        mcq('Which is a safe practice?', ['Using surge protectors', 'Overloading sockets', 'Wet hands on electronics', 'Eating near keyboard']),
        mcq('Eye strain can be reduced by?', ['Adjusting brightness', 'Staring continuously', 'Sitting too close', 'Ignoring lighting']),
        mcq('Ergonomics focuses on?', ['Comfortable and safe workspace', 'Hardware speed only', 'Software updates only', 'Decorations']),
      ],
      theory: [
        theory('Explain five safety measures when using ICT tools.'),
        theory('Describe ergonomic setup for a computer workstation.'),
        theory('Discuss risks of prolonged screen use and mitigation strategies.'),
        theory('Explain electrical safety when using ICT tools.'),
        theory('Describe first-aid steps for minor electrical shocks.'),
      ],
      practical: [
        practical('Arrange a safe workstation and label ergonomic elements.'),
        practical('Measure and adjust screen brightness and distance.'),
        practical('Create a checklist for ICT lab safety.'),
        practical('Demonstrate proper cable management for safety.'),
        practical('Design a safety poster for school ICT rooms.'),
      ],
    },
    'introduction-to-word-processing': {
      objective: [
        mcq('Which software is a word processor?', ['Microsoft Word', 'Photoshop', 'Excel', 'PowerPoint']),
        mcq('To save a document, use?', ['Ctrl+S', 'Ctrl+P', 'Ctrl+Z', 'Ctrl+X']),
        mcq('Font size changes are found under?', ['Home tab', 'Insert tab', 'Review tab', 'View tab']),
        mcq('To make text bold, use?', ['Ctrl+B', 'Ctrl+I', 'Ctrl+U', 'Ctrl+E']),
        mcq('Spell check is accessed via?', ['Review tab', 'Home tab', 'Insert tab', 'Layout tab']),
      ],
      theory: [
        theory('Explain steps to create, format, and save a document.'),
        theory('Describe the difference between fonts and styles.'),
        theory('Discuss the importance of spell check and grammar tools.'),
        theory('Explain how to insert images and tables in a document.'),
        theory('Describe page setup options and their uses.'),
      ],
      practical: [
        practical('Create a formatted one-page article with headings and lists.'),
        practical('Insert a table and image into a document and save as PDF.'),
        practical('Apply styles and create a table of contents.'),
        practical('Perform spell check and track changes on a paragraph.'),
        practical('Set margins and orientation, then print preview.'),
      ],
    },
    'introduction-to-computing-generation-of-computers': {
      objective: [
        mcq('Which generation introduced transistors?', ['Second generation', 'First generation', 'Third generation', 'Fourth generation']),
        mcq('Which component is central to fourth generation computers?', ['Microprocessor', 'Vacuum tube', 'Punch cards', 'Magnetic drum']),
        mcq('First generation computers used?', ['Vacuum tubes', 'Microchips', 'Transistors', 'Cloud storage']),
        mcq('Fifth generation focuses on?', ['AI', 'Steam power', 'Analog signals', 'Typewriters']),
        mcq('Punch cards were common in?', ['Early generations', 'Modern laptops', 'Smartphones', 'Cloud platforms']),
      ],
      theory: [
        theory('Explain characteristics of first and second generation computers.'),
        theory('Describe the impact of microprocessors on computing.'),
        theory('Discuss the evolution from vacuum tubes to transistors.'),
        theory('Explain the concept of AI in fifth generation computers.'),
        theory('Compare input methods across generations.'),
      ],
      practical: [
        practical('Create a timeline poster of computer generations.'),
        practical('Identify generation of sample devices with reasons.'),
        practical('Research a landmark microprocessor and present features.'),
        practical('Build a slideshow comparing vacuum tubes vs transistors.'),
        practical('Interview an IT professional on observed tech evolution.'),
      ],
    },
    'storage-systems': {
      objective: [
        mcq('Which is non-volatile?', ['SSD', 'RAM', 'Cache', 'Registers']),
        mcq('Which has fastest access?', ['Cache', 'HDD', 'SSD', 'Tape']),
        mcq('Optical storage example?', ['DVD', 'SSD', 'RAM', 'Cache']),
        mcq('Which unit measures storage?', ['Gigabyte', 'Kilowatt', 'Meter', 'Lumen']),
        mcq('External storage device?', ['USB drive', 'CPU', 'GPU', 'NIC']),
      ],
      theory: [
        theory('Explain differences between RAM, SSD, and HDD.'),
        theory('Discuss backup strategies for personal data.'),
        theory('Describe how cache memory improves performance.'),
        theory('Explain optical vs magnetic storage principles.'),
        theory('Discuss data safety and redundancy.'),
      ],
      practical: [
        practical('Measure file copy speeds between HDD and SSD.'),
        practical('Create a backup plan using cloud and local storage.'),
        practical('Calculate storage needs for a school project.'),
        practical('Organize files and demonstrate folder structures.'),
        practical('Test compression ratios for various file types.'),
      ],
    },
    'introduction-to-computing-input-&-output-devices': {
      objective: [
        mcq('Which is an output device?', ['Printer', 'Mouse', 'Keyboard', 'Microphone']),
        mcq('Barcode scanning uses?', ['Input device', 'Output device', 'Storage device', 'Network device']),
        mcq('Which device captures voice?', ['Microphone', 'Speaker', 'Monitor', 'Scanner']),
        mcq('Touchscreen is?', ['Both input and output', 'Input only', 'Output only', 'Storage']),
        mcq('Projector provides?', ['Visual output', 'Audio input', 'Storage', 'Power']),
      ],
      theory: [
        theory('Explain differences among input, output, and storage devices.'),
        theory('Describe five input devices and their uses.'),
        theory('Discuss emerging I/O technologies such as touch and voice.'),
        theory('Explain how scanners convert physical documents to digital.'),
        theory('Describe accessibility devices for users.'),
      ],
      practical: [
        practical('Set up a workstation and connect I/O devices.'),
        practical('Demonstrate scanning and printing a document.'),
        practical('Record audio and play it back with volume control.'),
        practical('Calibrate a touchscreen device.'),
        practical('Create a chart mapping devices to categories.'),
      ],
    },
    'file-management-techniques': {
      objective: [
        mcq('Which is a good file naming practice?', ['Descriptive names', 'Random strings', 'Spaces only', 'All caps only']),
        mcq('Which action reduces clutter?', ['Organizing folders', 'Duplicating files', 'Saving to desktop always', 'Using no folders']),
        mcq('Which helps find files quickly?', ['Search feature', 'Shutting down', 'Uninstalling apps', 'Renaming OS']),
        mcq('Backups should be performed?', ['Regularly', 'Never', 'Once a year', 'Only after loss']),
        mcq('Recycle Bin is used to?', ['Store deleted files temporarily', 'Permanently delete instantly', 'Install software', 'Print files']),
      ],
      theory: [
        theory('Explain steps to organize project files effectively.'),
        theory('Discuss versioning and backup strategies.'),
        theory('Describe file extensions and their significance.'),
        theory('Explain how cloud storage aids file management.'),
        theory('Discuss folder hierarchies for teams.'),
      ],
      practical: [
        practical('Organize messy folders into a clear structure.'),
        practical('Set up automatic backups and verify restores.'),
        practical('Create naming conventions and apply them.'),
        practical('Demonstrate searching and filtering files.'),
        practical('Archive old files and document the process.'),
      ],
    },
    'productivity-software': {
      objective: [
        mcq('Spreadsheet software example?', ['Microsoft Excel', 'Microsoft Word', 'GIMP', 'Audacity']),
        mcq('Presentation software example?', ['PowerPoint', 'Photoshop', 'Chrome', 'Notepad']),
        mcq('Which function sums cells?', ['SUM', 'AVG', 'MAX', 'MINUS']),
        mcq('Word processor feature for grammar?', ['Review tools', 'Filters', 'Brushes', 'Developer console']),
        mcq('Slides are part of?', ['Presentation', 'Spreadsheet', 'Database', 'Browser']),
      ],
      theory: [
        theory('Explain differences among word processors, spreadsheets, and presentation tools.'),
        theory('Describe use cases for spreadsheets in school.'),
        theory('Discuss best practices for presentation design.'),
        theory('Explain mail merge basics in word processors.'),
        theory('Describe collaborative features of productivity suites.'),
      ],
      practical: [
        practical('Create a budget spreadsheet with formulas and charts.'),
        practical('Design a 5-slide presentation with themes and images.'),
        practical('Write a formatted letter and perform mail merge.'),
        practical('Collaborate on a document and track changes.'),
        practical('Export documents to PDF and share.'),
      ],
    },
    'creating-tables-&-hyperlinks': {
      objective: [
        mcq('Hyperlink in a document does?', ['Opens a target', 'Formats text', 'Prints page', 'Inserts image']),
        mcq('Table cells are arranged in?', ['Rows and columns', 'Pages and views', 'Layers', 'Stacks']),
        mcq('To insert a table, use?', ['Insert tab', 'Review tab', 'Home tab', 'Developer tab']),
        mcq('Hyperlinks can point to?', ['Web pages', 'Only images', 'Only audio', 'Only local files']),
        mcq('Merging table cells creates?', ['One larger cell', 'More rows', 'More columns', 'Hyperlinks']),
      ],
      theory: [
        theory('Explain how to build tables for data presentation.'),
        theory('Describe the purpose and types of hyperlinks.'),
        theory('Discuss best practices for table formatting.'),
        theory('Explain internal vs external links in documents.'),
        theory('Describe accessibility considerations for tables and links.'),
      ],
      practical: [
        practical('Create a table for class scores and format it.'),
        practical('Insert hyperlinks to references in a report.'),
        practical('Build a table of contents using links.'),
        practical('Design a table with merged cells and styling.'),
        practical('Test links and fix broken ones in a document.'),
      ],
    },
    'introduction-to-presentation': {
      objective: [
        mcq('Transition effect applies to?', ['Slides', 'Cells', 'Paragraphs', 'Files']),
        mcq('To start slide show use?', ['F5', 'Ctrl+S', 'Ctrl+P', 'Alt+Tab']),
        mcq('Slides should include?', ['Key points', 'Paragraphs only', 'Random text', 'Too many fonts']),
        mcq('Images are inserted via?', ['Insert tab', 'Review tab', 'Layout tab', 'Data tab']),
        mcq('Speaker notes help?', ['Presenters', 'Printers', 'Scanners', 'Servers']),
      ],
      theory: [
        theory('Explain design principles for effective slides.'),
        theory('Describe how to use animations responsibly.'),
        theory('Discuss structuring presentations with an outline.'),
        theory('Explain using charts in presentations.'),
        theory('Describe methods for engaging an audience.'),
      ],
      practical: [
        practical('Create a 7-slide deck with title, agenda, and visuals.'),
        practical('Apply transitions and test timing.'),
        practical('Insert a chart and explain data.'),
        practical('Practice delivery using speaker notes.'),
        practical('Export slides and share.'),
      ],
    },
    'communication-networks-computer-networks': {
      objective: [
        mcq('LAN stands for?', ['Local Area Network', 'Large Area Network', 'Long Access Node', 'Local Access Notation']),
        mcq('Device that forwards data between networks?', ['Router', 'Monitor', 'Keyboard', 'Scanner']),
        mcq('Wireless standard commonly used?', ['Wi‑Fi', 'VGA', 'USB', 'HDMI']),
        mcq('IP address identifies?', ['Network devices', 'Only printers', 'Only servers', 'Only keyboards']),
        mcq('Switch operates at which layer?', ['Data link', 'Physical', 'Transport', 'Application']),
      ],
      theory: [
        theory('Explain differences between LAN, MAN, and WAN.'),
        theory('Describe the function of routers and switches.'),
        theory('Discuss IP addressing and subnetting basics.'),
        theory('Explain client-server vs peer-to-peer models.'),
        theory('Describe network security best practices.'),
      ],
      practical: [
        practical('Set up a simple LAN and test connectivity.'),
        practical('Configure a router with SSID and password.'),
        practical('Use ping and tracert to diagnose networks.'),
        practical('Create a topology diagram for a school network.'),
        practical('Secure Wi‑Fi with appropriate encryption.'),
      ],
    },
  };
  const key = Object.keys(banks).find(k => t.includes(k)) || slug;
  const bank = banks[key] || banks['components-of-computers-and-computer-systems'];
  const list = type === 'objective' ? bank.objective : (type === 'fill_in_the_blanks' ? bank.theory : (type === 'theory' ? bank.theory : bank.practical));
  const out = [] as any[];
  for (let i = 0; i < count; i++) {
    const tmpl = list[Math.floor(Math.random() * list.length)];
    const shuffled = type === 'objective' && Array.isArray((tmpl as any).options) ? shuffle((tmpl as any).options) : undefined;
    out.push({
      id: `${slug}-${type}-${i + 1}`,
      question: tmpl.question,
      type,
      options: type === 'objective' ? shuffled : undefined,
      answer: type === 'objective' ? (tmpl as any).answer : undefined,
    });
  }
  return out;
}

export async function gradeTheoryAnswer(
  question: string,
  studentAnswer: string,
  correctAnswer?: string,
  maxMarks: number = 5,
): Promise<number> {
  const useLLM = !!process.env.OPENAI_API_KEY;
  const clamp = (n: number) => Math.max(0, Math.min(maxMarks, Math.round(n)));
  if (useLLM) {
    try {
      const promptParts = [
        'You are grading a short theory answer for Basic 7/8 Computing. Score an integer from 0 to 5 only. Guidelines: 5 = fully correct and complete; 4 or 3 = close, mostly correct with minor gaps; 2 or 1 = partial or vague; 0 = irrelevant or wrong. Reply with the number only.',
        'Question: ' + String(question || ''),
        correctAnswer ? 'Expected points: ' + String(correctAnswer || '') : '',
        'Student answer: ' + String(studentAnswer || ''),
      ];
      const prompt = promptParts.filter(Boolean).join('\n');
      const resp = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0,
      });
      const content = String(resp.choices?.[0]?.message?.content || '0').trim();
      const num = parseInt(content, 10);
      if (!Number.isNaN(num)) return clamp(num);
    } catch {}
  }
  const a = String(studentAnswer || '').toLowerCase();
  const b = String(correctAnswer || '').toLowerCase();
  function tokens(s: string) {
    return new Set(s.replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean));
  }
  function keyTokens(s: string) {
    const stop = new Set([
      'explain','describe','discuss','difference','differentiate','function','functions','steps','process','using','use','diagram','below','identify','any','three','two','features','benefits','role','how','what','why','and','or','of','in','on','to','the','a','an'
    ]);
    const raw = Array.from(tokens(String(s || '').toLowerCase()));
    return new Set(raw.filter((t) => t.length >= 3 && !stop.has(t)));
  }
  const ta = tokens(a);
  let tb = tokens(b);
  if (tb.size === 0) {
    tb = keyTokens(question);
  }
  let inter = 0;
  tb.forEach((t) => {
    if (ta.has(t)) inter++;
  });
  const sim = tb.size > 0 ? inter / tb.size : 0;
  if (sim >= 0.8) return clamp(5);
  if (sim >= 0.5) return clamp(4);
  if (sim >= 0.35) return clamp(3);
  if (sim >= 0.2) return clamp(2);
  if (sim >= 0.1) return clamp(1);
  return 0;
}
