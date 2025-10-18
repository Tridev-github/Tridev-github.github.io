// Chunked resume content for retrieval (converted from LaTeX)
// Keep chunks short (sentences/bullets). Add/edit freely.
export const RESUME_CHUNKS = [
  // Header & contact
  {id: "contact-1", section: "Contact", text: "Tridev Methuku — +1 (716) 750-3488; tridevmethuku.0@gmail.com; GitHub: Tridev-github; LinkedIn: tridev-reddy-methuku."},

  // HERE Technologies
  {id: "here-0", section: "HERE Technologies (Research Engineer Intern, Chicago, IL; May 2025–Aug 2025)", text: "Developed lane-level analytics from graph-structured and image-based geospatial data, enabling accurate last-meter navigation."},
  {id: "here-1", section: "HERE Technologies", text: "Prototyped GenAI guidance solutions for micro-addressing and lane transitions, improving route prediction accuracy by 12%."},
  {id: "here-2", section: "HERE Technologies", text: "Orchestrated multi-LLM ensembles and multimodal models (vision + lane-graph + text) for guidance; grounded outputs with retrieval over lane and POI data to strengthen last-meter instructions."},
  {id: "here-3", section: "HERE Technologies", text: "Deployed prototypes in a cloud-based pipeline (AWS, Docker) with CI/CD and monitoring; scaled beyond 10K daily queries."},

  // SUNY Research Foundation
  {id: "suny-0", section: "SUNY Research Foundation (Research Lead — Research Aide, Buffalo, NY; Sep 2024–Present)", text: "Led a cross-functional team of 5 to optimize SPECT geometry with ML/DL models, improving spatial resolution by 18%."},
  {id: "suny-1", section: "SUNY Research Foundation", text: "Automated imaging pipelines using SQL, Pandas, and Airflow, reducing analysis throughput time by 30%."},
  {id: "suny-2", section: "SUNY Research Foundation", text: "Accelerated Monte Carlo reconstruction by 20% through simulation-informed modeling with GATE and ROOT."},
  {id: "suny-3", section: "SUNY Research Foundation", text: "Built AI agents (LangChain + MCP tools) on top of a RAG backend; ingestion via Airflow to S3/Postgres, document parsing with unstructured/pdfminer, and tool use for search, code, and data workflows."},
  {id: "suny-4", section: "SUNY Research Foundation", text: "Designed and deployed RAG: FAISS (dev) → Pinecone (prod), hybrid dense+BM25 retrieval (E5-large/text-embedding-3-large), re-ranking (BGE/Cross-Encoder), metadata filters, Redis caching, FastAPI service, MLflow evals (hit@k, MRR, faithfulness), and citation-grounded answers."},
  {id: "suny-5", section: "SUNY Research Foundation", text: "Collaborated with oncologists and radiologists, translating research into deployable imaging tools that secured $800K funding."},

  // Samsung R&D
  {id: "samsung-0", section: "Samsung R&D (Image Solutions Intern, Bengaluru, India; Aug 2023–Apr 2024)", text: "Trained SSD-MobileNet to detect HDR ghost artifacts; achieved 93% detection accuracy on internal validation."},
  {id: "samsung-1", section: "Samsung R&D", text: "Annotated and curated a large-scale HDR ghosting dataset; established labeling guidelines and QA checks, improving data quality and robustness across diverse scenes."},
  {id: "samsung-2", section: "Samsung R&D", text: "Implemented quantization and pruning for on-device deployment, improving inference speed by 25% and reducing model size by 40%."},
  {id: "samsung-3", section: "Samsung R&D", text: "Shipped the model in the camera imaging pipeline; actively used on millions of Samsung phones in production."},

  // Point Zero Solutions
  {id: "pzs-0", section: "Point Zero Solutions (AI Intern, Remote; May 2022–May 2023)", text: "Designed a real-time computer vision system for automated parking, achieving 96.8% detection accuracy and scaling to 100K images/day."},
  {id: "pzs-1", section: "Point Zero Solutions", text: "Built and deployed a GAN+RNN/LSTM pedestrian traffic model with DEEP SORT; optimized preprocessing boosted accuracy by 15%."},
  {id: "pzs-2", section: "Point Zero Solutions", text: "Presented system to client stakeholders, demonstrating impact on reducing energy costs via pedestrian-based power generation."},

  // Education
  {id: "edu-0", section: "Education", text: "M.S. in Computer Science (AI/ML), GPA 3.96/4.00 — State University of New York at Buffalo (Aug 2024–Present), Buffalo, NY."},
  {id: "edu-1", section: "Education", text: "B.Tech in Computer Science (Data Science), GPA 8.8/10 — Vellore Institute of Technology (Jul 2020–Jun 2024), Vellore, India."},

  // Projects
  {id: "proj-0", section: "Projects", text: "GAN-based Synthetic MRI Generation — Developed an end-to-end GAN pipeline with U-Net/CNN priors; achieved FID = 15.2; deployed via Docker + AWS SageMaker with MLflow."},
  {id: "proj-1", section: "Projects", text: "Transformer-based Text Classification — Fine-tuned BERT on IMDb sentiment dataset; reached 94.2% accuracy; implemented in PyTorch with HuggingFace Transformers and scikit-learn."},
  {id: "proj-2", section: "Projects", text: "LLM Agents & RAG — Built FAISS/Pinecone pipelines; reduced retrieval latency by 22% and improved answer accuracy by 15%; applied LoRA-based fine-tuning to open-source LLMs."},

  // Publications & Patents
  {id: "pub-0", section: "Publications & Patents", text: "SNMMI 2025 (presented); IEEE NSS/MIC/RTSD 2025 (accepted) — Paper on spatial-resolution metrics for self-collimation SPECT using deep learning for projection modeling and ML on Monte Carlo data."},
  {id: "pub-1", section: "Publications & Patents", text: "Submitted: KDD 2026 — BCS^2, a fast, adaptive 2-parameter clustering algorithm for telemetry/fleet analytics. SPIE 2026 — spatial-resolution metrics for tomography."},
  {id: "pub-2", section: "Publications & Patents", text: "Patents (Filed/Under Review): Vehicle Lane Acceleration Profiles (VLAP); Lane-level trajectory sharing; BCS^2 POI discovery; Direction-aware lane matching; Micro-point addressing for last-meter navigation."},

  // Skills
  {id: "skills-0", section: "Skills", text: "Languages: Python, C++, Java, SQL, Bash."},
  {id: "skills-1", section: "Skills", text: "ML/DL: PyTorch, TensorFlow, Keras, scikit-learn."},
  {id: "skills-2", section: "Skills", text: "Models: CNNs, U-Net, GANs, BERT, GNNs."},
  {id: "skills-3", section: "Skills", text: "LLM/Agents: LangChain, LlamaIndex, Hugging Face Hub, RAG, MCP."},
  {id: "skills-4", section: "Skills", text: "CV/Imaging: OpenCV, YOLO, SSD, HDR; GATE/ROOT."},
  {id: "skills-5", section: "Skills", text: "Data/Platforms: Pandas, NumPy, Airflow, Spark (intro)."},
  {id: "skills-6", section: "Skills", text: "MLOps/Infra: Docker, AWS (S3/EC2/SageMaker), MLflow, Linux, Git, FastAPI/Flask, Kubernetes (intro)."},
  {id: "skills-7", section: "Skills", text: "Optimization: Quantization, pruning, compression; edge deployment."}
];
