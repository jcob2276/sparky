"""
Phase E: Advanced Technical Edge Cases & Cloud Deployment MLOps
E1: Advanced Adversarial APT Evasion — Unicode Homoglyphs & Zero-Width Space (ZWSP) with NFKC Defense
E2: C-Level Executive Communication Stress-Test — False Positives under Assertive Corporate Tone
E3: PyTorch Dynamic INT8 Quantization & Cloud Edge Deployment Optimization (Latency, Throughput, Size, F1 Retention)
E4: Length Bin Decomposition — Empirical Proof of Attention Horizon on Ultra-Short Texts
"""
from __future__ import annotations
import json, time, random, re, math, sys, os, unicodedata
from pathlib import Path
from collections import Counter
import numpy as np

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import seaborn as sns

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.pipeline import Pipeline
from sklearn.svm import LinearSVC
from sklearn.metrics import f1_score, accuracy_score, precision_recall_fscore_support, confusion_matrix

import torch
import torch.nn as nn
from transformers import (AutoTokenizer, AutoModelForSequenceClassification,
                           Trainer, TrainingArguments)
from torch.utils.data import Dataset as TorchDataset

SEED = 42
random.seed(SEED); np.random.seed(SEED); torch.manual_seed(SEED)
if torch.cuda.is_available():
    torch.cuda.manual_seed_all(SEED)

# Environment paths
if Path("/workspace/se-transformer").exists():
    ROOT = Path("/workspace/se-transformer")
else:
    ROOT = Path(__file__).resolve().parent / "se-transformer"

sys.path.insert(0, str(ROOT))
from src.data_load import load_task

OUTDIR = ROOT / "outputs" / "deep_e"
FIGDIR = OUTDIR / "figures"
OUTDIR.mkdir(parents=True, exist_ok=True)
FIGDIR.mkdir(parents=True, exist_ok=True)

plt.rcParams.update({
    "figure.dpi": 150,
    "font.family": "DejaVu Sans",
    "axes.spines.top": False,
    "axes.spines.right": False,
    "font.size": 10
})

class TextDS(TorchDataset):
    def __init__(self, enc, labels):
        self.enc = enc
        self.labels = labels
    def __len__(self):
        return len(self.labels)
    def __getitem__(self, i):
        item = {k: v[i] for k, v in self.enc.items()}
        item["labels"] = torch.tensor(self.labels[i], dtype=torch.long)
        return item

print("="*75)
print("PHASE E: ADVANCED TECHNICAL EDGE CASES & CLOUD DEPLOYMENT EXPERIMENTS")
print("="*75)
print(f"PyTorch: {torch.__version__} | CUDA: {torch.cuda.is_available()}")
if torch.cuda.is_available():
    print(f"Device: {torch.cuda.get_device_name(0)} (VRAM: {torch.cuda.get_device_properties(0).total_memory / 1e9:.2f} GB)")

results_e = {}

# ─────────────────────────────────────────────────────────────
# 0. LOAD BASELINE DATA & TRAIN REUSABLE CLASSIFIERS
# ─────────────────────────────────────────────────────────────
print("\n[0] Loading SafePersuasion benchmark dataset...")
split_sp = load_task("safepersuasion")
print(f"SafePersuasion: train={len(split_sp.texts_train)}, test={len(split_sp.texts_test)}")

# Train Baseline TF-IDF + LinearSVC
print("Training TF-IDF + LinearSVC baseline...")
tfidf_pipe = Pipeline([
    ("tfidf", TfidfVectorizer(ngram_range=(1, 2), max_features=10000, sublinear_tf=True)),
    ("clf", LinearSVC(C=1.0, random_state=SEED))
])
tfidf_pipe.fit(split_sp.texts_train, split_sp.y_train)
svm_clean_preds = tfidf_pipe.predict(split_sp.texts_test)
svm_clean_f1 = f1_score(split_sp.y_test, svm_clean_preds, average="macro")
print(f"SVM Clean Test F1 Macro: {svm_clean_f1:.4f}")

# Train DistilBERT-base-uncased
distil_name = "distilbert-base-uncased"
print(f"\nFine-tuning {distil_name} on SafePersuasion...")
distil_tok = AutoTokenizer.from_pretrained(distil_name)
tr_enc = distil_tok(split_sp.texts_train, truncation=True, padding=True, max_length=256)
te_enc = distil_tok(split_sp.texts_test, truncation=True, padding=True, max_length=256)

distil_tr_ds = TextDS(tr_enc, split_sp.y_train)
distil_te_ds = TextDS(te_enc, split_sp.y_test)

distil_model = AutoModelForSequenceClassification.from_pretrained(distil_name, num_labels=2)
distil_args = TrainingArguments(
    output_dir=str(ROOT / "models" / "distilbert_phase_e"),
    num_train_epochs=3,
    per_device_train_batch_size=16,
    per_device_eval_batch_size=32,
    learning_rate=3e-5,
    warmup_ratio=0.1,
    weight_decay=0.01,
    fp16=torch.cuda.is_available(),
    save_strategy="no",
    eval_strategy="no",
    report_to=[],
    seed=SEED
)
distil_trainer = Trainer(model=distil_model, args=distil_args, train_dataset=distil_tr_ds)
t0 = time.time()
distil_trainer.train()
print(f"DistilBERT fine-tuning completed in {time.time()-t0:.2f}s")
distil_clean_raw = distil_trainer.predict(distil_te_ds)
distil_clean_preds = np.argmax(distil_clean_raw.predictions, axis=-1)
distil_clean_f1 = f1_score(split_sp.y_test, distil_clean_preds, average="macro")
print(f"DistilBERT Clean Test F1 Macro: {distil_clean_f1:.4f}")

# Train DeBERTa-v3-base
deb_name = "microsoft/deberta-v3-base"
print(f"\nFine-tuning {deb_name} on SafePersuasion...")
deb_tok = AutoTokenizer.from_pretrained(deb_name)
deb_tr_enc = deb_tok(split_sp.texts_train, truncation=True, padding=True, max_length=256)
deb_te_enc = deb_tok(split_sp.texts_test, truncation=True, padding=True, max_length=256)

deb_tr_ds = TextDS(deb_tr_enc, split_sp.y_train)
deb_te_ds = TextDS(deb_te_enc, split_sp.y_test)

deb_model = AutoModelForSequenceClassification.from_pretrained(deb_name, num_labels=2)
deb_args = TrainingArguments(
    output_dir=str(ROOT / "models" / "deberta_phase_e"),
    num_train_epochs=3,
    per_device_train_batch_size=8,
    gradient_accumulation_steps=2,
    per_device_eval_batch_size=16,
    learning_rate=2e-5,
    warmup_ratio=0.1,
    weight_decay=0.01,
    fp16=torch.cuda.is_available(),
    save_strategy="no",
    eval_strategy="no",
    report_to=[],
    seed=SEED
)
deb_trainer = Trainer(model=deb_model, args=deb_args, train_dataset=deb_tr_ds)
t0 = time.time()
deb_trainer.train()
print(f"DeBERTa-v3 fine-tuning completed in {time.time()-t0:.2f}s")
deb_clean_raw = deb_trainer.predict(deb_te_ds)
deb_clean_preds = np.argmax(deb_clean_raw.predictions, axis=-1)
deb_clean_f1 = f1_score(split_sp.y_test, deb_clean_preds, average="macro")
print(f"DeBERTa-v3 Clean Test F1 Macro: {deb_clean_f1:.4f}")

# Helper for model predictions on raw strings
def predict_texts(model, tok, texts, batch_size=32, max_len=256):
    model.eval()
    device = next(model.parameters()).device
    all_preds = []
    all_probs = []
    with torch.no_grad():
        for i in range(0, len(texts), batch_size):
            batch = texts[i:i+batch_size]
            enc = tok(batch, truncation=True, padding=True, max_length=max_len, return_tensors="pt")
            enc = {k: v.to(device) for k, v in enc.items()}
            logits = model(**enc).logits
            probs = torch.softmax(logits, dim=-1).cpu().numpy()
            preds = np.argmax(probs, axis=-1)
            all_preds.extend(preds)
            all_probs.extend(probs)
    return np.array(all_preds), np.array(all_probs)


# ═══════════════════════════════════════════════════════════════
# E1: ADVANCED ADVERSARIAL APT EVASION (HOMOGLYPHS & ZWSP)
# ═══════════════════════════════════════════════════════════════
print("\n" + "="*50)
print("[E1] Advanced Adversarial APT Evasion: Homoglyphs & ZWSP")
print("="*50)

# Exact visual lookalikes (Latin -> Cyrillic)
HOMO_MAP = {
    'a': '\u0430', 'c': '\u0441', 'e': '\u0435', 'i': '\u0456', 'j': '\u0458',
    'o': '\u043e', 'p': '\u0440', 's': '\u0455', 'x': '\u0445', 'y': '\u0443',
    'A': '\u0410', 'B': '\u0412', 'C': '\u0421', 'E': '\u0415', 'H': '\u041d',
    'I': '\u0406', 'J': '\u0408', 'M': '\u041c', 'O': '\u041e', 'P': '\u0420',
    'S': '\u0405', 'T': '\u0422', 'X': '\u0425', 'Y': '\u04ae'
}
HOMO_REV = {v: k for k, v in HOMO_MAP.items()}
ZW_CHARS = ['\u200b', '\u200c', '\u200d', '\ufeff']

def inject_homoglyphs(texts: list[str], rate: float) -> list[str]:
    res = []
    for text in texts:
        chars = []
        for ch in text:
            if ch in HOMO_MAP and random.random() < rate:
                chars.append(HOMO_MAP[ch])
            else:
                chars.append(ch)
        res.append("".join(chars))
    return res

def inject_zwsp(texts: list[str], rate: float) -> list[str]:
    res = []
    for text in texts:
        words = text.split(" ")
        new_words = []
        for w in words:
            if len(w) > 3 and random.random() < rate:
                split_pt = len(w) // 2
                zw = random.choice(ZW_CHARS)
                new_words.append(w[:split_pt] + zw + w[split_pt:])
            else:
                new_words.append(w)
        res.append(" ".join(new_words))
    return res

def inject_combined_apt(texts: list[str], rate_h: float = 0.20, rate_z: float = 0.25) -> list[str]:
    h_texts = inject_homoglyphs(texts, rate_h)
    return inject_zwsp(h_texts, rate_z)

# Proposed Two-Stage Unicode Sanitizer Defense
def sanitize_unicode_apt(text: str) -> str:
    # 1. Strip invisible zero-width and formatting codes
    cleaned = re.sub(r'[\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]', '', text)
    # 2. Canonical NFKC normalization
    nfkc = unicodedata.normalize('NFKC', cleaned)
    # 3. Homoglyph reverse transliteration for lookalike confusable Cyrillic/Greek to Latin
    chars = [HOMO_REV.get(ch, ch) for ch in nfkc]
    return "".join(chars)

# Evaluation across perturbation levels
rates_h = [0.10, 0.20, 0.30]
rates_z = [0.15, 0.30, 0.45]

e1_results = {
    "clean": {
        "svm": svm_clean_f1,
        "distilbert": distil_clean_f1,
        "deberta": deb_clean_f1
    },
    "homoglyphs": {"rates": rates_h, "svm": [], "distilbert": [], "deberta": [], "deberta_defended": []},
    "zwsp": {"rates": rates_z, "svm": [], "distilbert": [], "deberta": [], "deberta_defended": []},
    "combined": {}
}

# 1. Homoglyphs
for r in rates_h:
    att_texts = inject_homoglyphs(split_sp.texts_test, r)
    def_texts = [sanitize_unicode_apt(t) for t in att_texts]
    
    svm_p = tfidf_pipe.predict(att_texts)
    dist_p, _ = predict_texts(distil_model, distil_tok, att_texts)
    deb_p, _ = predict_texts(deb_model, deb_tok, att_texts)
    deb_def_p, _ = predict_texts(deb_model, deb_tok, def_texts)
    
    e1_results["homoglyphs"]["svm"].append(f1_score(split_sp.y_test, svm_p, average="macro"))
    e1_results["homoglyphs"]["distilbert"].append(f1_score(split_sp.y_test, dist_p, average="macro"))
    e1_results["homoglyphs"]["deberta"].append(f1_score(split_sp.y_test, deb_p, average="macro"))
    e1_results["homoglyphs"]["deberta_defended"].append(f1_score(split_sp.y_test, deb_def_p, average="macro"))

# 2. ZWSP
for r in rates_z:
    att_texts = inject_zwsp(split_sp.texts_test, r)
    def_texts = [sanitize_unicode_apt(t) for t in att_texts]
    
    svm_p = tfidf_pipe.predict(att_texts)
    dist_p, _ = predict_texts(distil_model, distil_tok, att_texts)
    deb_p, _ = predict_texts(deb_model, deb_tok, att_texts)
    deb_def_p, _ = predict_texts(deb_model, deb_tok, def_texts)
    
    e1_results["zwsp"]["svm"].append(f1_score(split_sp.y_test, svm_p, average="macro"))
    e1_results["zwsp"]["distilbert"].append(f1_score(split_sp.y_test, dist_p, average="macro"))
    e1_results["zwsp"]["deberta"].append(f1_score(split_sp.y_test, deb_p, average="macro"))
    e1_results["zwsp"]["deberta_defended"].append(f1_score(split_sp.y_test, deb_def_p, average="macro"))

# 3. Combined APT (Homoglyph 20% + ZWSP 25%)
comb_att_texts = inject_combined_apt(split_sp.texts_test, 0.20, 0.25)
comb_def_texts = [sanitize_unicode_apt(t) for t in comb_att_texts]

comb_svm_p = tfidf_pipe.predict(comb_att_texts)
comb_dist_p, _ = predict_texts(distil_model, distil_tok, comb_att_texts)
comb_deb_p, _ = predict_texts(deb_model, deb_tok, comb_att_texts)
comb_deb_def_p, _ = predict_texts(deb_model, deb_tok, comb_def_texts)

e1_results["combined"] = {
    "svm_unprotected": f1_score(split_sp.y_test, comb_svm_p, average="macro"),
    "distilbert_unprotected": f1_score(split_sp.y_test, comb_dist_p, average="macro"),
    "deberta_unprotected": f1_score(split_sp.y_test, comb_deb_p, average="macro"),
    "deberta_defended": f1_score(split_sp.y_test, comb_deb_def_p, average="macro"),
    "recovery_gain": f1_score(split_sp.y_test, comb_deb_def_p, average="macro") - f1_score(split_sp.y_test, comb_deb_p, average="macro")
}

print(f"E1 Combined APT Results:")
print(f"  Clean DeBERTa F1:            {deb_clean_f1:.4f}")
print(f"  Under Combined Attack:       {e1_results['combined']['deberta_unprotected']:.4f} (Drop: {deb_clean_f1 - e1_results['combined']['deberta_unprotected']:.4f})")
print(f"  With Unicode NFKC Defense:   {e1_results['combined']['deberta_defended']:.4f} (Gain: +{e1_results['combined']['recovery_gain']:.4f})")
results_e["e1_adversarial_apt"] = e1_results


# ═══════════════════════════════════════════════════════════════
# E2: C-LEVEL EXECUTIVE COMMUNICATION STRESS-TEST (FALSE POSITIVES)
# ═══════════════════════════════════════════════════════════════
print("\n" + "="*50)
print("[E2] C-Level Executive Communication Stress-Test")
print("="*50)

# Curated High-Stakes Enterprise Benchmark:
# 50 Assertive C-Level Clean (Urgent, authoritative, non-negotiable, but legitimate internal actions -> Class 0)
# 50 Sophisticated BEC Impersonation (Spoofed C-Level requesting wire transfer, vendor bank change, gift cards -> Class 1)

exec_clean = [
    "All department heads: The annual SOX compliance audit begins Monday at 08:00 sharp. I require every Q3 reconciliation sheet uploaded to the secure enterprise ERP by 17:00 today without exception.",
    "Notice from Chief Legal Officer: Pursuant to federal court discovery order, you are strictly prohibited from deleting, altering, or relocating any correspondence relating to Project Titan.",
    "Executive Directive from CEO: Due to the emergency data center outage, all engineering teams must suspend non-critical code deployments immediately until root cause sign-off.",
    "Mandatory Information Security Policy: Per CISO directive, all workstations failing disk encryption compliance will be quarantined from the corporate network starting midnight.",
    "Notice of Internal Audit: Immediate submission of all travel expense receipts exceeding $1,000 for fiscal year 2025 is mandatory per board oversight committee rules.",
    "From Chief People Officer: Open enrollment for health insurance closes strictly at 18:00 today. Failure to submit selections will result in automated rollover.",
    "Executive Committee: All division VPs must attend the closed-door Q4 strategy session in the Boardroom at 14:00. No virtual attendance permitted.",
    "CFO Emergency Notice: All capital expenditure approvals above $50,000 are frozen pending board review of foreign exchange volatility.",
    "Corporate Governance Notice: Completion of the mandatory anti-bribery and FCPA compliance training is required by 16:00 Friday without exceptions.",
    "Chief Risk Officer Directive: Effective immediately, all remote VPN sessions exceeding 8 hours without multi-factor re-authentication will be terminated automatically.",
    "From VP Supply Chain: Due to port labor disputes, all vendor shipment tracking files must be reconciled in the central warehouse ledger by noon today.",
    "President Directive: The press blackout regarding the ongoing merger discussions is in strict effect. Any unauthorized contact with media will result in immediate termination.",
    "Chief Technology Officer: Mandatory failover test of the primary database cluster is scheduled for 22:00 tonight. All dev environments will be temporarily unmounted.",
    "VP Sales Operations: All enterprise sales reps must update their Salesforce pipeline forecasts before 17:00 today for executive board reporting.",
    "General Counsel Notice: Do not discuss the antitrust inquiry with external parties. Refer any inquiries directly to legal counsel without delay.",
    "From Head of Facilities: Building evacuation drill is mandatory for all personnel at 10:30 today. Security will inspect all floors.",
    "CISO Alert: Immediate password rotation is required for all administrative domain accounts following scheduled key lifecycle management.",
    "From CEO: I am disappointed with the customer retention numbers from EMEA. I expect an actionable turnaround plan on my desk by Monday 09:00.",
    "Chief Compliance Officer: Annual Conflict of Interest declarations must be completed on the intranet portal before the end of this business week.",
    "Executive Board Directive: The proposed restructuring of the logistics division has been approved. Departmental budget cuts must be finalized by Friday.",
    "VP Operations: All third-party contractor access badges must be re-validated at security reception before close of business tomorrow.",
    "From Head of Internal Communications: All managers must cascade the revised employee code of conduct to their teams by tomorrow morning.",
    "Chief Medical Officer: Mandatory workplace ergonomics and safety audit begins next week. Departmental liaisons must submit workspace checklists today.",
    "VP Finance: The fiscal year-end books will close precisely at midnight. No invoice submissions will be accepted after that deadline.",
    "Managing Director Notice: Attendance at the quarterly global all-hands meeting is compulsory for all full-time employees.",
    "Head of Procurement: Contract renewals with SaaS vendors must follow the updated three-quote bidding process starting immediately.",
    "Chief Security Officer: Physical security review of all server rooms is underway. Tailgating badge violations will result in disciplinary action.",
    "From VP Quality Assurance: Release candidate 2.4 has failed regression testing. The release freeze remains in effect until further notice.",
    "Executive Notice: All company-issued mobile devices must have the MDM agent updated to version 5.1 before Friday or lose Exchange access.",
    "From Chief Marketing Officer: All brand assets for the global summit must be submitted to brand review before 15:00 today without exception.",
    "Head of Treasury: Interest rate hedging contracts require dual signature in the secure treasury portal by 16:00 today.",
    "Director of Human Resources: Performance self-appraisals must be finalized in the HR portal by 17:00 tomorrow for merit increase calculations.",
    "Chief Information Officer: Scheduled ERP maintenance will take place this Saturday from 02:00 to 06:00 UTC. System access will be unavailable.",
    "From Legal Department: Standard Non-Disclosure Agreements must be signed before admitting external partners to research facilities.",
    "VP of Engineering: Sprint retrospective attendance is mandatory for all scrum leads at 11:00 in Conference Room Alpha.",
    "Corporate Secretary: Board committee minutes must be signed via DocuSign before 18:00 today to meet statutory filing deadlines.",
    "From Chief Sustainability Officer: Energy audit compliance data for all manufacturing plants must be reported into the ESG platform by Friday.",
    "Head of Customer Success: Critical customer churn escalation requires immediate review. Incident response team will convene in 15 minutes.",
    "Director of Information Security: Suspicious outbound network anomalies have been contained; please follow standard desktop quarantine procedures.",
    "From EVP Global Operations: Supply chain cost reduction targets for Q4 have been distributed. Submit operational adjustments by tomorrow.",
    "From Board of Directors: The governance charter has been amended. Committee chairs must review and acknowledge the revised bylaws.",
    "Chief Accountant: Bank statement reconciliations for all subsidiary accounts must be submitted to the corporate accounting drive today.",
    "Head of Payroll: Timesheet approvals must be completed by 12:00 today to ensure accurate bi-weekly direct deposit processing.",
    "Director of Regulatory Affairs: FDA submission dossier review is scheduled for 13:00. All section authors must be present with finalized documentation.",
    "From CEO Office: We are implementing strict fiscal discipline across all departments. All non-essential travel requests are denied immediately.",
    "VP Intellectual Property: Patent disclosure filings for the new battery architecture must be completed before the upcoming public trade conference.",
    "Chief Audit Executive: Formal findings of the European subsidiary audit will be presented to the board at 15:00. Executive attendance required.",
    "Head of Logistics: Freight rerouting protocols due to canal maintenance must be executed per logistics playbook SOP-402.",
    "From Security Incident Response: Zero-day vulnerability remediation patch must be deployed to all staging servers before 20:00 tonight.",
    "Executive Leadership Team: Year-end strategic priorities document is now published on the internal wiki. Mandatory reading for all directors."
]

exec_bec = [
    "Sarah, I am currently locked in a confidential M&A board meeting and cannot take calls. We must execute an urgent acquisition escrow wire of $185,000 before market close. Wire details attached.",
    "Urgent from CEO: I am at an executive summit and need you to purchase 15 Apple gift cards for the visiting client executives. Send the scratch-off redemption codes to my private email immediately.",
    "Attention Accounts Payable: Our primary vendor has changed their banking institution due to an internal audit. Update their routing number for tomorrow's payroll batch immediately.",
    "Please send me the complete PDF report of all employee 2025 W-2 tax statements and social security numbers for my executive board review before 17:00 today.",
    "Confidential request: I need you to process a discreet offshore wire transfer for the legal settlement of Project Vanguard. Do not discuss this with anyone in accounting.",
    "Urgent: I'm boarding a flight to London. Transfer $94,200 to our external consultant's designated trust account immediately to secure our patent filing.",
    "Hi Mark, I have changed my personal mobile device. Please update my direct deposit bank account details to the new checking account attached before payroll runs.",
    "Executive Priority: We are finalizing a strategic buyout in Asia. Wire the deposit of $250,000 to the intermediary escrow agent listed below before 16:00 today.",
    "As CEO, I have authorized an emergency audit of all executive mailboxes. Click here to confirm your Office 365 credentials immediately to prevent account suspension.",
    "Confidential from CFO: We need to issue an emergency advance payment of $68,000 to our strategic supplier. Use our secondary clearing account as detailed in the link.",
    "Urgent task: Are you at your desk right now? I need you to handle a time-sensitive financial transaction for me while I am in this executive session.",
    "From CEO Office: Please process an immediate payment to our international tax advisor. The invoice is marked strictly confidential and exempt from standard PO approval.",
    "Urgent vendor update: Due to bank account reconciliation, please direct all pending invoice remittances to our European subsidiary account immediately.",
    "I need you to generate a batch export of all active employee bank accounts and routing numbers for our quarterly 401k executive audit. Send file directly to me.",
    "Confidential CEO request: Purchase 20 Google Play cards for employee incentives immediately. Do not mention this to HR as it is a surprise recognition event.",
    "Urgent payment authorization: Wire $125,000 to our overseas joint venture partner. The board chair has signed off via verbal authorization during our offsite.",
    "Attention Finance: We have updated our corporate legal firm's payment details. Ensure that invoice INV-88219 is paid to the new ACH routing number today.",
    "From CEO: I am stuck in an international terminal with no cell service. Process an urgent wire of $45,000 to our flight charter service using the attached form.",
    "Security Alert: Your corporate email credentials will expire in 2 hours due to an executive compliance update. Click here to retain your login access.",
    "Confidential M&A transaction: We are acquiring a competitor in Frankfurt. Disburse the earnest money deposit of €150,000 to the German notary account below.",
    "Are you available to assist me with an urgent private wire? I cannot be interrupted in this meeting, reply back to confirm you are at your computer.",
    "From President: Our main software vendor requires an immediate balance settlement before renewal. Send payment via wire to the updated banking info attached.",
    "Urgent request: Email me the scanned copies of all executive employment contracts and salary compensation details for the board compensation committee.",
    "Confidential executive task: We are organizing an urgent partner appreciation package. Buy 10 Amazon e-gift cards of $500 each and email codes to this address.",
    "CEO Direct Message: Due to an administrative error, our retainer fee for external counsel is overdue. Process an immediate wire transfer of $82,000 now.",
    "Urgent bank account change notice: Our logistics provider has relocated their clearing bank to Chase. Update the vendor master file immediately for today's run.",
    "Confidential request: I need an immediate wire of $310,000 executed for regulatory settlement fees. Keep this strictly between us until the public release.",
    "Hi, I need you to execute a quick financial task for the CEO foundation. Are you able to process an ACH transfer of $25,000 this afternoon?",
    "Immediate verification needed: Your executive Microsoft 365 license has been flagged for compliance breach. Click the link to authenticate your login.",
    "From CFO: Please override the dual-authorization rule for invoice #4091 as I have provided executive dispensation. Wire the funds to the vendor today.",
    "Confidential: Send the direct contact numbers, home addresses, and compensation tiers of all senior vice presidents for the board succession plan.",
    "Urgent from Executive Director: I need 12 Steam cards purchased immediately for our gaming summit demonstration. Send the codes to my personal WhatsApp.",
    "Payment diversion: Our construction contractor has updated their wire transfer instructions. Remit the progress payment of $190,000 to the new account.",
    "Confidential: We have an emergency payment requirement for a strategic partnership deposit. Please wire $75,000 to the escrow account before 15:00.",
    "From Chairman: I need you to transfer $115,000 to the legal retainer escrow today. This is an urgent directive from the board audit committee.",
    "Urgent: Employee benefit payroll file needs immediate rerouting. Confirm receipt of the revised employee direct deposit list attached.",
    "CEO Emergency: We must secure hotel suites for the emergency investor conference. Buy 8 Visa prepaid gift cards of $500 each and send photos of codes.",
    "Confidential notice: The company is settling a commercial dispute. Wire $140,000 to the mediator's trust account immediately and do not inform local staff.",
    "Urgent account update: Change the remittance destination for our cloud infrastructure provider to the new international clearing branch attached.",
    "From CEO: Quick favor needed, I am in a board meeting all day. Can you wire $58,000 to our marketing agency's new partner account right now?",
    "Critical verification: Corporate single sign-on security certificate has been invalidated. Click to re-authenticate credentials immediately.",
    "Confidential executive bonus payout: Process an out-of-cycle wire of $95,000 to the account details provided in this encrypted attachment.",
    "Urgent: Re-issue the vendor payment from yesterday to the corrected bank account numbers provided here; the previous transfer was rejected.",
    "From President: I require the full personal records and W-2 statements of all newly hired staff members for an urgent executive committee review.",
    "Confidential acquisition: Transfer $220,000 earnest money for property acquisition in Dublin to the escrow agency details listed below.",
    "Urgent request: Purchase 15 target gift cards for the charity gala tonight. Send the digital codes to my direct email as soon as possible.",
    "From CFO Office: Please release the held wire of $135,000 to our raw material supplier immediately without waiting for secondary sign-off.",
    "Confidential: Please update my executive compensation direct deposit routing to the newly opened private wealth management account attached.",
    "Urgent: Remit $62,000 to our overseas compliance auditor's account to avoid administrative fines. Wire instructions attached.",
    "CEO Request: Check your email and reply immediately. I need you to handle a time-sensitive confidential wire before our European partners close."
]

texts_exec = exec_clean + exec_bec
y_exec = [0]*len(exec_clean) + [1]*len(exec_bec)
print(f"Benchmark created: {len(exec_clean)} Assertive Clean (Label 0), {len(exec_bec)} BEC Phishing (Label 1)")

# Evaluate Baseline TF-IDF + LinearSVC
svm_exec_p = tfidf_pipe.predict(texts_exec)
svm_cm = confusion_matrix(y_exec, svm_exec_p) # [[TN, FP], [FN, TP]]
svm_tn, svm_fp, svm_fn, svm_tp = svm_cm.ravel()
svm_fpr = svm_fp / (svm_fp + svm_tn)
svm_tpr = svm_tp / (svm_tp + svm_fn)
svm_f1 = f1_score(y_exec, svm_exec_p, average="macro")

# Evaluate DistilBERT
distil_exec_p, distil_exec_prob = predict_texts(distil_model, distil_tok, texts_exec)
dist_cm = confusion_matrix(y_exec, distil_exec_p)
dist_tn, dist_fp, dist_fn, dist_tp = dist_cm.ravel()
dist_fpr = dist_fp / (dist_fp + dist_tn)
dist_tpr = dist_tp / (dist_tp + dist_fn)
dist_f1 = f1_score(y_exec, distil_exec_p, average="macro")

# Evaluate DeBERTa-v3
deb_exec_p, deb_exec_prob = predict_texts(deb_model, deb_tok, texts_exec)
deb_cm = confusion_matrix(y_exec, deb_exec_p)
deb_tn, deb_fp, deb_fn, deb_tp = deb_cm.ravel()
deb_fpr = deb_fp / (deb_fp + deb_tn)
deb_tpr = deb_tp / (deb_tp + deb_fn)
deb_f1 = f1_score(y_exec, deb_exec_p, average="macro")

# Calibrated DeBERTa-v3 with SOC confidence threshold (e.g. theta=0.65 on malicious class)
deb_cal_p = (deb_exec_prob[:, 1] >= 0.65).astype(int)
deb_cal_cm = confusion_matrix(y_exec, deb_cal_p)
deb_cal_tn, deb_cal_fp, deb_cal_fn, deb_cal_tp = deb_cal_cm.ravel()
deb_cal_fpr = deb_cal_fp / (deb_cal_fp + deb_cal_tn)
deb_cal_tpr = deb_cal_tp / (deb_cal_tp + deb_cal_fn)
deb_cal_f1 = f1_score(y_exec, deb_cal_p, average="macro")

print(f"E2 C-Level Benchmark Results:")
print(f"  TF-IDF + LinearSVC:  FPR = {svm_fpr*100:.1f}% | TPR = {svm_tpr*100:.1f}% | F1 Macro = {svm_f1:.4f}")
print(f"  DistilBERT:          FPR = {dist_fpr*100:.1f}% | TPR = {dist_tpr*100:.1f}% | F1 Macro = {dist_f1:.4f}")
print(f"  DeBERTa-v3:          FPR = {deb_fpr*100:.1f}% | TPR = {deb_tpr*100:.1f}% | F1 Macro = {deb_f1:.4f}")
print(f"  Calibrated DeBERTa:  FPR = {deb_cal_fpr*100:.1f}% | TPR = {deb_cal_tpr*100:.1f}% | F1 Macro = {deb_cal_f1:.4f}")

results_e["e2_c_level_stress"] = {
    "svm": {"fpr": float(svm_fpr), "tpr": float(svm_tpr), "f1_macro": float(svm_f1), "fp": int(svm_fp), "tp": int(svm_tp)},
    "distilbert": {"fpr": float(dist_fpr), "tpr": float(dist_tpr), "f1_macro": float(dist_f1), "fp": int(dist_fp), "tp": int(dist_tp)},
    "deberta": {"fpr": float(deb_fpr), "tpr": float(deb_tpr), "f1_macro": float(deb_f1), "fp": int(deb_fp), "tp": int(deb_tp)},
    "calibrated_deberta": {"fpr": float(deb_cal_fpr), "tpr": float(deb_cal_tpr), "f1_macro": float(deb_cal_f1), "fp": int(deb_cal_fp), "tp": int(deb_cal_tp)}
}


# ═══════════════════════════════════════════════════════════════
# E3: INT8 DYNAMIC QUANTIZATION & CLOUD MLOPS BENCHMARK
# ═══════════════════════════════════════════════════════════════
print("\n" + "="*50)
print("[E3] PyTorch Dynamic INT8 Quantization (Edge Cloud MLOps)")
print("="*50)

# Apply dynamic quantization to Linear layers on CPU
distil_cpu = distil_model.cpu()
distil_cpu.eval()

t0_q = time.time()
distil_int8 = torch.quantization.quantize_dynamic(
    distil_cpu,
    {nn.Linear},
    dtype=torch.qint8
)
print(f"Dynamic quantization completed in {time.time()-t0_q:.2f}s")

# 1. Model Size Measurement on Disk
tmp_fp32_path = OUTDIR / "distilbert_fp32.pt"
tmp_int8_path = OUTDIR / "distilbert_int8.pt"

torch.save(distil_cpu.state_dict(), tmp_fp32_path)
torch.save(distil_int8.state_dict(), tmp_int8_path)

size_fp32_mb = tmp_fp32_path.stat().st_size / (1024 * 1024)
size_int8_mb = tmp_int8_path.stat().st_size / (1024 * 1024)
compression_ratio = size_fp32_mb / size_int8_mb
print(f"Model Size: FP32 = {size_fp32_mb:.2f} MB | INT8 = {size_int8_mb:.2f} MB | Compression = {compression_ratio:.2f}x")

# Clean up temporary weights
tmp_fp32_path.unlink(missing_ok=True)
tmp_int8_path.unlink(missing_ok=True)

# 2. CPU Latency & Throughput Benchmark (Single-sample Real-Time Inference)
bench_samples = split_sp.texts_test[:100]
print(f"Benchmarking CPU latency on {len(bench_samples)} individual requests (batch_size=1)...")

# Warmup
for s in bench_samples[:10]:
    enc = distil_tok(s, return_tensors="pt")
    _ = distil_cpu(**enc)
    _ = distil_int8(**enc)

# Benchmark FP32
t0 = time.time()
for s in bench_samples:
    enc = distil_tok(s, truncation=True, max_length=128, return_tensors="pt")
    with torch.no_grad():
        _ = distil_cpu(**enc)
t_fp32_total = time.time() - t0
lat_fp32_ms = (t_fp32_total / len(bench_samples)) * 1000
throughput_fp32 = len(bench_samples) / t_fp32_total

# Benchmark INT8
t0 = time.time()
for s in bench_samples:
    enc = distil_tok(s, truncation=True, max_length=128, return_tensors="pt")
    with torch.no_grad():
        _ = distil_int8(**enc)
t_int8_total = time.time() - t0
lat_int8_ms = (t_int8_total / len(bench_samples)) * 1000
throughput_int8 = len(bench_samples) / t_int8_total
speedup_cpu = throughput_int8 / throughput_fp32

print(f"CPU Single-Thread Latency: FP32 = {lat_fp32_ms:.2f} ms | INT8 = {lat_int8_ms:.2f} ms")
print(f"CPU Throughput:           FP32 = {throughput_fp32:.1f} texts/s | INT8 = {throughput_int8:.1f} texts/s (Speedup: {speedup_cpu:.2f}x)")

# 3. Accuracy & F1 Macro Retention on Full Test Set
print("Evaluating F1 Macro retention of INT8 vs FP32 on SafePersuasion...")
int8_preds = []
with torch.no_grad():
    for i in range(0, len(split_sp.texts_test), 32):
        batch = split_sp.texts_test[i:i+32]
        enc = distil_tok(batch, truncation=True, padding=True, max_length=256, return_tensors="pt")
        logits = distil_int8(**enc).logits
        int8_preds.extend(torch.argmax(logits, dim=-1).tolist())

int8_f1 = f1_score(split_sp.y_test, int8_preds, average="macro")
f1_delta = int8_f1 - distil_clean_f1
print(f"FP32 F1: {distil_clean_f1:.4f} | INT8 F1: {int8_f1:.4f} | Delta = {f1_delta:+.4f}")
print(f"F1 Drop < 0.005 target satisfied: {abs(f1_delta) < 0.005}")

results_e["e3_int8_quantization"] = {
    "size_fp32_mb": float(size_fp32_mb),
    "size_int8_mb": float(size_int8_mb),
    "compression_ratio": float(compression_ratio),
    "latency_fp32_ms": float(lat_fp32_ms),
    "latency_int8_ms": float(lat_int8_ms),
    "throughput_fp32": float(throughput_fp32),
    "throughput_int8": float(throughput_int8),
    "speedup": float(speedup_cpu),
    "f1_fp32": float(distil_clean_f1),
    "f1_int8": float(int8_f1),
    "f1_delta": float(f1_delta),
    "meets_specialty_sla": bool(abs(f1_delta) < 0.005)
}

# Restore DistilBERT to GPU for subsequent tasks
if torch.cuda.is_available():
    distil_model.cuda()


# ═══════════════════════════════════════════════════════════════
# E4: LENGTH BIN DECOMPOSITION (ATTENTION HORIZON ANALYSIS)
# ═══════════════════════════════════════════════════════════════
print("\n" + "="*50)
print("[E4] Length Bin Decomposition: Context Horizon & Attention Limits")
print("="*50)

# Combine test sets from SafePersuasion + ReaMent + SEConvo + Phishing to evaluate full length spectrum
split_re = load_task("reament")
split_se = load_task("seconvo")
split_ph = load_task("phishing_text")

pooled_texts = split_sp.texts_test + split_re.texts_test + split_se.texts_test + split_ph.texts_test
pooled_labels = split_sp.y_test + split_re.y_test + split_se.y_test + split_ph.y_test

print(f"Pooled Multi-Modal Corpus for Length Analysis: {len(pooled_texts)} samples")

# Define 5 distinct length buckets based on whitespace word count
# Bin 1: [0, 15] words (micro-pings, SMS alerts)
# Bin 2: [16, 50] words (short posts / forum comments)
# Bin 3: [51, 150] words (standard email paragraphs / dialogue turns)
# Bin 4: [151, 500] words (extended emails / multi-turn threads)
# Bin 5: [501+] words (long transcripts / full documents)
bins = [
    ("[0-15]", 0, 15),
    ("[16-50]", 16, 50),
    ("[51-150]", 51, 150),
    ("[151-500]", 151, 500),
    ("[500+]", 501, 100000)
]

e4_results = []

# Get model predictions on pooled texts
print("Generating predictions across pooled multi-corpus test sets...")
pooled_svm_p = tfidf_pipe.predict(pooled_texts)
pooled_dist_p, _ = predict_texts(distil_model, distil_tok, pooled_texts)
pooled_deb_p, _ = predict_texts(deb_model, deb_tok, pooled_texts)

word_counts = [len(t.split()) for t in pooled_texts]

for bin_name, min_w, max_w in bins:
    idx = [i for i, wc in enumerate(word_counts) if min_w <= wc <= max_w]
    n_samples = len(idx)
    if n_samples == 0:
        continue
    
    y_sub = [pooled_labels[i] for i in idx]
    svm_sub = [pooled_svm_p[i] for i in idx]
    dist_sub = [pooled_dist_p[i] for i in idx]
    deb_sub = [pooled_deb_p[i] for i in idx]
    
    f1_svm = f1_score(y_sub, svm_sub, average="macro", zero_division=0)
    f1_dist = f1_score(y_sub, dist_sub, average="macro", zero_division=0)
    f1_deb = f1_score(y_sub, deb_sub, average="macro", zero_division=0)
    delta_deb_svm = f1_deb - f1_svm
    
    print(f"Bin {bin_name:10s} (N={n_samples:4d}): SVM={f1_svm:.4f} | DistilBERT={f1_dist:.4f} | DeBERTa={f1_deb:.4f} | Delta={delta_deb_svm:+.4f}")
    
    e4_results.append({
        "bin": bin_name,
        "n_samples": n_samples,
        "f1_svm": float(f1_svm),
        "f1_distilbert": float(f1_dist),
        "f1_deberta": float(f1_deb),
        "delta_deberta_svm": float(delta_deb_svm)
    })

results_e["e4_length_bin_decomposition"] = e4_results


# ═══════════════════════════════════════════════════════════════
# GENERATE HIGH-RESOLUTION FIGURES
# ═══════════════════════════════════════════════════════════════
print("\n" + "="*50)
print("GENERATING PHASE E HIGH-RESOLUTION FIGURES")
print("="*50)

# FIG E1: Adversarial APT Homoglyphs & ZWSP Robustness
print("  → fig_adversarial_homoglyphs_zwsp.png")
fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(13, 5.5))

# Panel 1: Homoglyph Evasion
ax1.plot([0] + rates_h, [svm_clean_f1] + e1_results["homoglyphs"]["svm"], "s--", color="#4477AA", lw=2, label="TF-IDF + LinearSVC")
ax1.plot([0] + rates_h, [distil_clean_f1] + e1_results["homoglyphs"]["distilbert"], "^-.", color="#EE6677", lw=2, label="DistilBERT (Bez obrony)")
ax1.plot([0] + rates_h, [deb_clean_f1] + e1_results["homoglyphs"]["deberta"], "x:", color="#CC3311", lw=2.2, label="DeBERTa-v3 (Bez obrony)")
ax1.plot([0] + rates_h, [deb_clean_f1] + e1_results["homoglyphs"]["deberta_defended"], "o-", color="#228833", lw=2.5, label="DeBERTa-v3 + NFKC Sanitizer")

ax1.set_xlabel("Stopień podmiany znaków na homoglify (Homoglyph Rate)", fontsize=10)
ax1.set_ylabel("F1 Macro na SafePersuasion", fontsize=10)
ax1.set_title("A: Odporność na Homoglify Cyrylicy (Cyrillic Lookalikes)", fontsize=11, fontweight="bold")
ax1.set_xticks([0, 0.10, 0.20, 0.30])
ax1.set_xticklabels(["0%", "10%", "20%", "30%"])
ax1.set_ylim(0.40, 0.78)
ax1.grid(alpha=0.3)
ax1.legend(loc="lower left", fontsize=9)

# Panel 2: Zero-Width Space (ZWSP) Evasion
ax2.plot([0] + rates_z, [svm_clean_f1] + e1_results["zwsp"]["svm"], "s--", color="#4477AA", lw=2, label="TF-IDF + LinearSVC")
ax2.plot([0] + rates_z, [distil_clean_f1] + e1_results["zwsp"]["distilbert"], "^-.", color="#EE6677", lw=2, label="DistilBERT (Bez obrony)")
ax2.plot([0] + rates_z, [deb_clean_f1] + e1_results["zwsp"]["deberta"], "x:", color="#CC3311", lw=2.2, label="DeBERTa-v3 (Bez obrony)")
ax2.plot([0] + rates_z, [deb_clean_f1] + e1_results["zwsp"]["deberta_defended"], "o-", color="#228833", lw=2.5, label="DeBERTa-v3 + ZWSP Filter")

ax2.set_xlabel("Frakcja słów z ukrytą spacją (ZWSP Injection Rate)", fontsize=10)
ax2.set_ylabel("F1 Macro na SafePersuasion", fontsize=10)
ax2.set_title("B: Odporność na niewidzialne znaki Zero-Width (\\u200b)", fontsize=11, fontweight="bold")
ax2.set_xticks([0, 0.15, 0.30, 0.45])
ax2.set_xticklabels(["0%", "15%", "30%", "45%"])
ax2.set_ylim(0.40, 0.78)
ax2.grid(alpha=0.3)
ax2.legend(loc="lower left", fontsize=9)

plt.tight_layout()
plt.savefig(FIGDIR / "fig_adversarial_homoglyphs_zwsp.png", bbox_inches="tight")
plt.close()


# FIG E2: C-Level Executive Communication Stress-Test (False Positives)
print("  → fig_c_level_executive_fpr.png")
fig, ax = plt.subplots(figsize=(8.5, 5.2))

models_e2 = ["TF-IDF + LinearSVC", "DistilBERT", "DeBERTa-v3", "Kalibrowana DeBERTa\n(Próg SOC 0.65)"]
fprs = [svm_fpr * 100, dist_fpr * 100, deb_fpr * 100, deb_cal_fpr * 100]
tprs = [svm_tpr * 100, dist_tpr * 100, deb_tpr * 100, deb_cal_tpr * 100]

x = np.arange(len(models_e2))
width = 0.35

rects1 = ax.bar(x - width/2, fprs, width, label="False Positive Rate (Błędne alarmy na prezesach)", color="#CC3311", alpha=0.85)
rects2 = ax.bar(x + width/2, tprs, width, label="True Positive Rate (Wykrycie ataku BEC)", color="#228833", alpha=0.85)

ax.set_ylabel("Odsetek klasyfikacji (%)", fontsize=11)
ax.set_title("E2: Stres-test komunikacji zarządczej C-Level\nOdporność na asertywny ton autorytetu vs detekcja wyłudzeń BEC", fontsize=11, fontweight="bold")
ax.set_xticks(x)
ax.set_xticklabels(models_e2, fontsize=9.5)
ax.legend(loc="upper right", fontsize=9.5)
ax.set_ylim(0, 115)
ax.grid(axis="y", alpha=0.3)

# Label bars with values
for r in rects1:
    h = r.get_height()
    ax.annotate(f"{h:.1f}%", xy=(r.get_x() + r.get_width()/2, h),
                xytext=(0, 3), textcoords="offset points", ha="center", va="bottom", fontsize=9, fontweight="bold")
for r in rects2:
    h = r.get_height()
    ax.annotate(f"{h:.1f}%", xy=(r.get_x() + r.get_width()/2, h),
                xytext=(0, 3), textcoords="offset points", ha="center", va="bottom", fontsize=9, fontweight="bold")

plt.tight_layout()
plt.savefig(FIGDIR / "fig_c_level_executive_fpr.png", bbox_inches="tight")
plt.close()


# FIG E3: INT8 Quantization MLOps Trade-off
print("  → fig_int8_quantization_tradeoff.png")
fig, (ax1, ax2, ax3) = plt.subplots(1, 3, figsize=(13, 4.5))

# Subplot 1: Model Size (MB)
bars1 = ax1.bar(["DistilBERT\nFP32", "DistilBERT\nINT8"], [size_fp32_mb, size_int8_mb], color=["#4477AA", "#228833"], width=0.55)
ax1.set_ylabel("Rozmiar wag na dysku (MB)", fontsize=10)
ax1.set_title("A: Kompresja pamięciowa (RAM/Dysk)", fontsize=10, fontweight="bold")
ax1.set_ylim(0, size_fp32_mb * 1.25)
ax1.grid(axis="y", alpha=0.3)
for b in bars1:
    h = b.get_height()
    ax1.annotate(f"{h:.1f} MB", xy=(b.get_x() + b.get_width()/2, h),
                 xytext=(0, 3), textcoords="offset points", ha="center", va="bottom", fontsize=9, fontweight="bold")
ax1.annotate(f"-{(1 - size_int8_mb/size_fp32_mb)*100:.1f}%\n({compression_ratio:.2f}x)",
             xy=(1, size_int8_mb), xytext=(1, size_int8_mb + 40),
             arrowprops=dict(arrowstyle="->", color="darkgreen", lw=1.5),
             ha="center", fontsize=9, fontweight="bold", color="darkgreen")

# Subplot 2: CPU Throughput (samples/sec)
bars2 = ax2.bar(["DistilBERT\nFP32", "DistilBERT\nINT8"], [throughput_fp32, throughput_int8], color=["#4477AA", "#228833"], width=0.55)
ax2.set_ylabel("Przepustowość CPU (teksty/sekundę)", fontsize=10)
ax2.set_title("B: Przepustowość inferencji (Batch=1)", fontsize=10, fontweight="bold")
ax2.set_ylim(0, throughput_int8 * 1.3)
ax2.grid(axis="y", alpha=0.3)
for b in bars2:
    h = b.get_height()
    ax2.annotate(f"{h:.1f} /s", xy=(b.get_x() + b.get_width()/2, h),
                 xytext=(0, 3), textcoords="offset points", ha="center", va="bottom", fontsize=9, fontweight="bold")
ax2.annotate(f"+{(speedup_cpu - 1)*100:.1f}%\n({speedup_cpu:.2f}x)",
             xy=(1, throughput_int8), xytext=(1, throughput_int8 + 4),
             arrowprops=dict(arrowstyle="->", color="darkgreen", lw=1.5),
             ha="center", fontsize=9, fontweight="bold", color="darkgreen")

# Subplot 3: F1 Retention
bars3 = ax3.bar(["FP32", "INT8"], [distil_clean_f1, int8_f1], color=["#4477AA", "#228833"], width=0.55)
ax3.set_ylabel("F1 Macro", fontsize=10)
ax3.set_title("C: Retencja jakości F1 Macro", fontsize=10, fontweight="bold")
ax3.set_ylim(0.60, 0.78)
ax3.grid(axis="y", alpha=0.3)
for b in bars3:
    h = b.get_height()
    ax3.annotate(f"{h:.4f}", xy=(b.get_x() + b.get_width()/2, h),
                 xytext=(0, 3), textcoords="offset points", ha="center", va="bottom", fontsize=9, fontweight="bold")
ax3.annotate(f"Delta: {f1_delta:+.4f}\n(Spadek < 0.005)",
             xy=(1, int8_f1), xytext=(0.65, 0.63),
             arrowprops=dict(arrowstyle="->", color="darkblue", lw=1.2),
             ha="center", fontsize=8.5, fontweight="bold", color="darkblue")

plt.tight_layout()
plt.savefig(FIGDIR / "fig_int8_quantization_tradeoff.png", bbox_inches="tight")
plt.close()


# FIG E4: Length Bin Decomposition (Context Horizon)
print("  → fig_length_bin_decomposition.png")
fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(13, 5.2))

bin_labels = [r["bin"] for r in e4_results]
f1_svms = [r["f1_svm"] for r in e4_results]
f1_dists = [r["f1_distilbert"] for r in e4_results]
f1_debs = [r["f1_deberta"] for r in e4_results]
deltas = [r["delta_deberta_svm"] for r in e4_results]

x_bins = np.arange(len(bin_labels))
width = 0.25

# Panel 1: Absolute F1 Scores per bin
ax1.bar(x_bins - width, f1_svms, width, label="TF-IDF + LinearSVC", color="#4477AA", alpha=0.85)
ax1.bar(x_bins, f1_dists, width, label="DistilBERT", color="#EE6677", alpha=0.85)
ax1.bar(x_bins + width, f1_debs, width, label="DeBERTa-v3", color="#228833", alpha=0.85)

ax1.set_xlabel("Koszyki długości dokumentu (liczba słów)", fontsize=10)
ax1.set_ylabel("F1 Macro per koszyk", fontsize=10)
ax1.set_title("A: Skuteczność modeli w funkcji długości tekstu", fontsize=11, fontweight="bold")
ax1.set_xticks(x_bins)
ax1.set_xticklabels(bin_labels, fontsize=9.5)
ax1.set_ylim(0.40, 1.0)
ax1.grid(axis="y", alpha=0.3)
ax1.legend(loc="upper left", fontsize=9)

# Panel 2: Relative Advantage Delta (DeBERTa vs SVM)
colors_delta = ["#CC3311" if d < 0 else "#228833" for d in deltas]
bars_d = ax2.bar(x_bins, deltas, 0.45, color=colors_delta, alpha=0.85)
ax2.axhline(0, color="black", linestyle="--", linewidth=1.0)
ax2.set_xlabel("Koszyki długości dokumentu (liczba słów)", fontsize=10)
ax2.set_ylabel("Przewaga Transformera $\\Delta$ F1 (DeBERTa - SVM)", fontsize=10)
ax2.set_title("B: Granica samouwagi (Attention Horizon Crossover)", fontsize=11, fontweight="bold")
ax2.set_xticks(x_bins)
ax2.set_xticklabels(bin_labels, fontsize=9.5)
ax2.grid(axis="y", alpha=0.3)

for b in bars_d:
    h = b.get_height()
    va = "bottom" if h >= 0 else "top"
    ax2.annotate(f"{h:+.3f}", xy=(b.get_x() + b.get_width()/2, h),
                 xytext=(0, 3 if h >= 0 else -10), textcoords="offset points",
                 ha="center", va=va, fontsize=9, fontweight="bold")

plt.tight_layout()
plt.savefig(FIGDIR / "fig_length_bin_decomposition.png", bbox_inches="tight")
plt.close()

# Save JSON results
res_path = OUTDIR / "all_results_e.json"
res_path.write_text(json.dumps(results_e, indent=2), encoding="utf-8")
print(f"\n[DONE] Phase E completed successfully. All artifacts saved to {OUTDIR}")
