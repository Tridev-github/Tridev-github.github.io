// Lines (polylines) are defined in 1200x800 coordinates for the SVG viewBox.
// Stations reference a line and a coordinate on that map, plus full details.

export const LINES = [
  {
    id: 'experience', name: 'Experience', css: 'exp',
    path: [
      [120,120],[320,180],[520,220],[750,200],[980,160]  // red-ish
    ]
  },
  {
    id: 'projects', name: 'Projects', css: 'proj',
    path: [
      [120,360],[300,380],[520,360],[760,420],[1000,460] // teal-ish
    ]
  },
  {
    id: 'education', name: 'Education', css: 'edu',
    path: [
      [160,560],[400,560],[640,560],[880,560] // blue
    ]
  },
  {
    id: 'publications', name: 'Pubs & Patents', css: 'pub',
    path: [
      [220,720],[420,680],[640,700],[900,720] // purple
    ]
  },
  {
    id: 'skills', name: 'Skills', css: 'skill',
    path: [
      [1080,120],[1080,240],[1080,360],[1080,520],[1080,700] // vertical amber
    ]
  },
  {
    id: 'contact', name: 'Contact', css: 'contact',
    path: [
      [80,80],[80,720] // simple vertical green
    ]
  }
];

// Helper to shorten bullet creation
const B = (...items) => items;

export const STATIONS = [
  // ------- EXPERIENCE -------
  {
    id:'here', line:'experience', at:[520,220],
    title:'HERE Technologies — Research Engineer Intern',
    sub:'Chicago, IL · May 2025 – Aug 2025',
    body:'Lane-level analytics and multimodal guidance for precise last-meter navigation.',
    bullets: B(
      'Built lane-level analytics from graph + image geospatial data for last-meter navigation.',
      'Prototyped GenAI guidance for micro-addressing and lane transitions: ~12% route prediction boost.',
      'Orchestrated multi-LLM ensembles; grounded outputs with retrieval over lanes & POIs.',
      'Deployed AWS/Docker prototypes with CI/CD & monitoring; scaled beyond 10K daily queries.'
    ),
    tags:['Multimodal','LLM-orchestration','Routing','AWS','Docker']
  },
  {
    id:'suny', line:'experience', at:[750,200],
    title:'SUNY Research Foundation — Research Lead / Aide',
    sub:'Buffalo, NY · Sep 2024 – Present',
    body:'SPECT imaging optimization and RAG-powered tooling for clinicians.',
    bullets: B(
      'Led a 5-person team; ~18% spatial-resolution improvement via ML/DL on SPECT geometry.',
      'Automated pipelines (SQL, Pandas, Airflow) for ~30% faster analysis throughput.',
      'Accelerated Monte Carlo reconstruction ~20% using simulation-informed modeling (GATE/ROOT).',
      'Built agents (LangChain + MCP) on RAG backend; ingestion via Airflow→S3/Postgres; parsing with unstructured/pdfminer.',
      'RAG stack: FAISS→Pinecone, hybrid (E5-large + BM25), re-ranking (BGE/Cross-Encoder), metadata filters, Redis cache, FastAPI service, MLflow metrics (hit@k, MRR, faithfulness).',
      'Collaboration with oncologists/radiologists helped secure ~$800K funding.'
    ),
    tags:['Medical Imaging','RAG','Airflow','FastAPI','MLflow']
  },
  {
    id:'samsung', line:'experience', at:[980,160],
    title:'Samsung R&D — Image Solutions Intern',
    sub:'Bengaluru, India · Aug 2023 – Apr 2024',
    body:'HDR ghost-artifact detection shipped in camera pipeline (millions of devices).',
    bullets: B(
      'Trained SSD-MobileNet HDR ghost detector; ~93% accuracy on internal validation.',
      'Curated a large HDR ghosting dataset; labeling guidelines + QA for diverse scenes.',
      'Quantization/pruning for on-device deployment: ~25% faster, ~40% smaller.',
      'Shipped into camera imaging pipeline; active on millions of Samsung phones.'
    ),
    tags:['CV','Edge','Quantization','Pruning','SSD-MobileNet']
  },
  {
    id:'pzs', line:'experience', at:[320,180],
    title:'Point Zero Solutions — AI Intern',
    sub:'Remote · May 2022 – May 2023',
    body:'Realtime vision for automated parking; tracking + scaling.',
    bullets: B(
      'Realtime CV system for automated parking; ~96.8% detection accuracy; scaled to ~100K images/day.',
      'Built GAN + RNN/LSTM pedestrian traffic model with DEEP SORT; preprocessing boosted accuracy ~15%.',
      'Stakeholder presentations; reduced energy costs via pedestrian-based power scheduling.'
    ),
    tags:['Object Detection','Tracking','OpenCV','DEEP SORT']
  },

  // ------- PROJECTS -------
  {
    id:'proj_mri', line:'projects', at:[520,360],
    title:'GAN-based Synthetic MRI Generation',
    sub:'Project',
    body:'End-to-end GAN pipeline (U-Net/CNN priors) to expand MRI diversity.',
    bullets: B(
      'FID ≈ 15.2; deployed via Docker + SageMaker; tracked with MLflow.',
      'Constraints for anatomical fidelity; intensity/SSIM focus to avoid mode collapse.'
    ),
    tags:['GAN','U-Net','SageMaker','MLflow']
  },
  {
    id:'proj_bert', line:'projects', at:[760,420],
    title:'Transformer Text Classification',
    sub:'Project',
    body:'IMDb sentiment with BERT fine-tuning.',
    bullets: B(
      '~94.2% accuracy; PyTorch + HuggingFace + scikit-learn.',
      'Robust split, early stopping, LR warmup; confusion matrix + class F1s.'
    ),
    tags:['BERT','PyTorch','NLP']
  },
  {
    id:'proj_rag', line:'projects', at:[300,380],
    title:'LLM Agents & RAG',
    sub:'Project',
    body:'Tool-using agents (MCP) and production-grade retrieval.',
    bullets: B(
      'Hybrid retrieval (dense + BM25), re-ranking; ~22% lower latency and ~15% answer gain.',
      'LoRA-based fine-tuning for efficient adaptation; citation formatting.'
    ),
    tags:['Agents','RAG','LoRA','Re-ranking']
  },

  // ------- EDUCATION -------
  {
    id:'edu_suny', line:'education', at:[400,560],
    title:'SUNY Buffalo — M.S. Computer Science (AI/ML)',
    sub:'Buffalo, NY · Aug 2024 – Present · GPA: 3.96/4.00',
    body:'Graduate focus: AI/ML, imaging, and retrieval systems.',
    bullets: B('Coursework/projects across CV, NLP, RAG, and systems.')
  },
  {
    id:'edu_vit', line:'education', at:[640,560],
    title:'VIT — B.Tech Computer Science (Data Science)',
    sub:'Vellore, India · Jul 2020 – Jun 2024 · GPA: 8.8/10',
    body:'Undergrad with emphasis on ML foundations + data pipelines.',
    bullets: B('Capstone and internships aligned to applied ML/CV.')
  },

  // ------- PUBLICATIONS / PATENTS -------
  {
    id:'pub_main', line:'publications', at:[640,700],
    title:'Publications',
    sub:'SNMMI 2025 (presented); IEEE NSS/MIC/RTSD 2025 (accepted)',
    body:'Spatial-resolution metrics for self-collimation SPECT using DL for projection modeling and ML on Monte Carlo.',
    bullets: B('Clinical-adjacent eval; focus on faithfulness + interpretability.')
  },
  {
    id:'pub_submit', line:'publications', at:[420,680],
    title:'Submissions',
    sub:'KDD 2026; SPIE 2026',
    body:'KDD: BCS^2 fast 2-param clustering for telemetry/fleet analytics. SPIE: tomography metrics.',
    bullets: B('Emphasis on scalability and adaptive clustering.')
  },
  {
    id:'patents', line:'publications', at:[900,720],
    title:'Patents (Filed/Under Review)',
    sub:'Navigation & analytics',
    body:'VLAP; lane-level trajectory sharing; BCS^2 POI discovery; direction-aware lane matching; micro-point addressing.',
    bullets: B('Focus: last-meter navigation + lane-aware intelligence.')
  },

  // ------- SKILLS (as small “stack” stations) -------
  { id:'skill_lang', line:'skills', at:[1080,240], title:'Languages', sub:'', body:'Python, C++, Java, SQL, Bash', bullets:[] },
  { id:'skill_ml',   line:'skills', at:[1080,360], title:'ML/DL', sub:'', body:'PyTorch, TensorFlow, Keras, scikit-learn', bullets:[] },
  { id:'skill_models',line:'skills', at:[1080,520], title:'Models', sub:'', body:'CNNs, U-Net, GANs, BERT, GNNs', bullets:[] },
  { id:'skill_ops',  line:'skills', at:[1080,700], title:'MLOps/Infra', sub:'', body:'Docker, AWS (S3/EC2/SageMaker), MLflow, Linux, Git, FastAPI/Flask, Kubernetes (intro)', bullets:[] },
  { id:'skill_cv',   line:'skills', at:[1080,120], title:'CV/Imaging', sub:'', body:'OpenCV, YOLO, SSD, HDR; GATE/ROOT', bullets:[] },

  // ------- CONTACT -------
  {
    id:'contact', line:'contact', at:[80,400],
    title:'Contact',
    sub:'Say hi',
    body:'+1 (716) 750-3488 · tridevmethuku.0@gmail.com · LinkedIn: tridev-reddy-methuku',
    links:[
      { label:'Email', href:'mailto:tridevmethuku.0@gmail.com' },
      { label:'LinkedIn', href:'https://www.linkedin.com/in/tridev-reddy-methuku-590535203/' }
    ]
  }
];
