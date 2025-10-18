// Expanded, retrieval-friendly chunks derived from your LaTeX resume.
// Keep each chunk atomic (1–3 sentences). Edit freely to update your site.
export const RESUME_CHUNKS = [
  // -------- Contact / Summary --------
  {id:"contact-1", section:"Contact", text:"Tridev Methuku — +1 (716) 750-3488; tridevmethuku.0@gmail.com; LinkedIn: tridev-reddy-methuku."},
  {id:"summary-1", section:"Profile", text:"AI/ML engineer focused on computer vision, multimodal guidance, and RAG systems. Comfortable shipping models to production and building end-to-end pipelines."},

  // -------- HERE Technologies --------
  {id:"here-0", section:"HERE Technologies — Research Engineer Intern (Chicago, IL; May 2025–Aug 2025)", text:"Developed lane-level analytics from graph-structured and image-based geospatial data to enable accurate last-meter navigation."},
  {id:"here-1", section:"HERE Technologies", text:"Prototyped GenAI guidance for micro-addressing and lane transitions; achieved ~12% improvement in route prediction accuracy."},
  {id:"here-2", section:"HERE Technologies", text:"Built multimodal guidance models combining vision, lane-graph, and text. Used retrieval over lanes and POIs to ground instructions and reduce hallucination."},
  {id:"here-3", section:"HERE Technologies", text:"Orchestrated multi-LLM routing/ensembles; designed prompts and response adjudication so guidance remains stable across edge cases (missing lanes, occlusions)."},
  {id:"here-4", section:"HERE Technologies", text:"Deployed prototypes to a cloud pipeline (AWS, Docker) with CI/CD and monitoring; scaled PoC to >10K daily queries."},
  {id:"here-5", section:"HERE Technologies — Tech Detail", text:"Lane-level graph signals: turn restrictions, lane counts, lane connectivity, exit links, and POI proximity; vision inputs from curb ramps, crosswalks, and signage cues."},

  // -------- SUNY Research Foundation --------
  {id:"suny-0", section:"SUNY Research Foundation — Research Lead/Aide (Buffalo, NY; Sep 2024–Present)", text:"Led a team of 5 to optimize SPECT geometry with ML/DL; improved spatial resolution by ~18%."},
  {id:"suny-1", section:"SUNY Research Foundation", text:"Automated imaging pipelines with SQL, Pandas, and Airflow; reduced analysis throughput time by ~30%."},
  {id:"suny-2", section:"SUNY Research Foundation", text:"Accelerated Monte Carlo reconstruction by ~20% via simulation-informed modeling using GATE and ROOT."},
  {id:"suny-3", section:"SUNY Research Foundation", text:"Built AI agents (LangChain + MCP tools) on a RAG backend; ingestion via Airflow to S3/Postgres; parsing with unstructured and pdfminer; tool use for search, code, and data."},
  {id:"suny-4", section:"SUNY Research Foundation", text:"RAG stack: FAISS (dev) → Pinecone (prod), hybrid dense+BM25 (E5-large/text-embedding-3-large), re-ranking (BGE/Cross-Encoder), metadata filters, Redis caching."},
  {id:"suny-5", section:"SUNY Research Foundation", text:"Served a FastAPI retrieval service; tracked MLflow metrics (hit@k, MRR, faithfulness) and produced citation-grounded answers for clinicians."},
  {id:"suny-6", section:"SUNY Research Foundation — Impact", text:"Collaborated with oncologists and radiologists; work translated to deployable imaging tools that helped secure ~$800K funding."},
  {id:"suny-7", section:"SUNY Research Foundation — Detail", text:"Tasks included ROI selection, segmentation QA, noise modeling, and attenuation corrections to stabilize SPECT quantitation."},

  // -------- Samsung R&D --------
  {id:"samsung-0", section:"Samsung R&D — Image Solutions Intern (Bengaluru, India; Aug 2023–Apr 2024)", text:"Trained SSD-MobileNet to detect HDR ghost artifacts; ~93% detection accuracy on internal validation."},
  {id:"samsung-1", section:"Samsung R&D", text:"Built labeling guidelines and QA checks for a large HDR ghosting dataset; improved data quality and robustness across lighting/motion conditions."},
  {id:"samsung-2", section:"Samsung R&D", text:"Implemented quantization and pruning for on-device deployment; improved inference speed by ~25% and reduced model size by ~40%."},
  {id:"samsung-3", section:"Samsung R&D", text:"Shipped the detector into the camera imaging pipeline; used in production on millions of Samsung phones."},
  {id:"samsung-4", section:"Samsung R&D — Detail", text:"Handled edge cases such as rapid motion, rolling shutter skew, and low-light HDR fusion; tuned NMS thresholds and anchor priors."},

  // -------- Point Zero Solutions --------
  {id:"pzs-0", section:"Point Zero Solutions — AI Intern (Remote; May 2022–May 2023)", text:"Built a real-time computer vision system for automated parking; ~96.8% detection accuracy; scaled to ~100K images/day."},
  {id:"pzs-1", section:"Point Zero Solutions", text:"Designed a pedestrian traffic model with GAN+RNN/LSTM and DEEP SORT; preprocessing optimizations improved accuracy by ~15%."},
  {id:"pzs-2", section:"Point Zero Solutions", text:"Presented system to stakeholders; reduced operational energy costs by optimizing pedestrian-based power generation scheduling."},
  {id:"pzs-3", section:"Point Zero Solutions — Detail", text:"Deployed with OpenCV pipelines, lightweight object trackers, and batching; monitored drift and re-calibrated thresholds over time."},

  // -------- Education --------
  {id:"edu-0", section:"Education", text:"M.S. in Computer Science (AI/ML), GPA 3.96/4.00 — SUNY Buffalo (Aug 2024–Present), Buffalo, NY."},
  {id:"edu-1", section:"Education", text:"B.Tech in Computer Science (Data Science), GPA 8.8/10 — VIT (Jul 2020–Jun 2024), Vellore, India."},

  // -------- Projects --------
  {id:"proj-mri-0", section:"Project — GAN-based Synthetic MRI", text:"Built an end-to-end GAN pipeline with U-Net/CNN priors to generate MRI variants; achieved FID ≈ 15.2; deployed with Docker + SageMaker; tracked in MLflow."},
  {id:"proj-mri-1", section:"Project — GAN-based Synthetic MRI", text:"Emphasis on anatomical fidelity and texture realism; constraints on intensity histograms and structural similarity to avoid mode collapse."},
  {id:"proj-bert-0", section:"Project — Transformer Text Classification", text:"Fine-tuned BERT on IMDb sentiment; ~94.2% accuracy; implemented with PyTorch, HuggingFace Transformers, and scikit-learn."},
  {id:"proj-bert-1", section:"Project — Transformer Text Classification", text:"Included robust split, early stopping, and learning-rate warmup; logged confusion matrices and class-wise F1 scores."},
  {id:"proj-rag-0", section:"Project — LLM Agents & RAG", text:"Engineered tool-using agents (MCP) on top of FAISS/Pinecone; reduced retrieval latency by ~22% and improved answer accuracy by ~15% via re-ranking."},
  {id:"proj-rag-1", section:"Project — LLM Agents & RAG", text:"RAG features: hybrid retrieval, passage chunking, semantic filters, rerankers, and citation formatting; added LoRA fine-tuning for adaptation."},

  // -------- Publications & Patents --------
  {id:"pub-0", section:"Publications", text:"SNMMI 2025 (presented); IEEE NSS/MIC/RTSD 2025 (accepted): spatial-resolution metrics for self-collimation SPECT using DL for projection modeling and ML regression/clustering on Monte Carlo data."},
  {id:"pub-1", section:"Publications — Submissions", text:"KDD 2026: BCS^2, a fast, adaptive 2-parameter clustering algorithm for telemetry/fleet analytics. SPIE 2026: spatial-resolution metrics for tomography."},
  {id:"pat-0", section:"Patents", text:"Filed/under review: Vehicle Lane Acceleration Profiles (VLAP); lane-level trajectory sharing; BCS^2 POI discovery; direction-aware lane matching; micro-point addressing for last-meter navigation."},

  // -------- Skills --------
  {id:"skills-lang", section:"Skills", text:"Languages: Python, C++, Java, SQL, Bash."},
  {id:"skills-ml", section:"Skills", text:"ML/DL: PyTorch, TensorFlow, Keras, scikit-learn."},
  {id:"skills-models", section:"Skills", text:"Models: CNNs, U-Net, GANs, BERT, GNNs."},
  {id:"skills-cv", section:"Skills", text:"CV/Imaging: OpenCV, YOLO, SSD, HDR; GATE/ROOT."},
  {id:"skills-data", section:"Skills", text:"Data/Platforms: Pandas, NumPy, Airflow, Spark (intro)."},
  {id:"skills-mlops", section:"Skills", text:"MLOps/Infra: Docker, AWS (S3/EC2/SageMaker), MLflow, Linux, Git, FastAPI/Flask, Kubernetes (intro)."},
  {id:"skills-opt", section:"Skills", text:"Optimization: quantization, pruning, compression; edge deployment."},

  // -------- Helpful “Q&A prompt bait” chunks (explanatory) --------
  {id:"expl-cv-0", section:"Explainers", text:"HDR ghost artifacts arise from motion between bracketed exposures; a detector flags likely ghosting for downstream HDR fusion safeguards."},
  {id:"expl-rag-0", section:"Explainers", text:"Hybrid retrieval combines dense embeddings with BM25 keyword signals; re-ranking with cross-encoders tends to improve top-k faithfulness."},
  {id:"expl-lastmeter-0", section:"Explainers", text:"Last-meter navigation focuses on precise lane choice, curb approach, and micro-addressing instructions to reach the exact drop-off/pick-up point."}
];
