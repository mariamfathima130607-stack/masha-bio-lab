import { useState } from 'react'
import { GraduationCap, ChevronRight, ChevronLeft } from 'lucide-react'

const STEPS = [
  {
    title: 'Understanding Your Data',
    icon: '📊',
    content: (
      <>
        <p>Drug–cell response experiments measure how cancer cells respond to various drug compounds. The key output variables are:</p>
        <div className="callout info mt-12">
          <div className="callout-title">IC50 (Half-Maximal Inhibitory Concentration)</div>
          <div className="callout-body">The drug concentration at which 50% of cell growth is inhibited. <strong>Lower IC50 = more potent drug</strong>. Measured in μM or nM. Typically log-transformed because values span many orders of magnitude.</div>
        </div>
        <div className="callout info mt-12">
          <div className="callout-title">AUC (Area Under the Curve)</div>
          <div className="callout-body">Summarizes the full dose-response curve. A high AUC means the cell line is <strong>resistant</strong> to the drug across all tested concentrations.</div>
        </div>
        <div className="callout success mt-12">
          <div className="callout-title">💡 Key Insight</div>
          <div className="callout-body">Different cell lines from different cancer types have very different sensitivities to the same drug. This variation is what ML models try to predict.</div>
        </div>
      </>
    ),
  },
  {
    title: 'Data Upload & Schema Detection',
    icon: '📁',
    content: (
      <>
        <p>The pipeline begins by uploading a CSV file containing experimental measurements.</p>
        <div className="callout info mt-12">
          <div className="callout-title">Typical Column Structure</div>
          <div className="callout-body">
            <code>drug_name</code>, <code>cell_line</code>, <code>ic50</code>, <code>auc</code>, <code>response</code>
          </div>
        </div>
        <p className="mt-12">The <strong>Schema Intelligence</strong> module automatically identifies which columns contain drug names, cell lines, IC50 values, and AUC values — using keyword matching in column names.</p>
        <div className="callout success mt-12">
          <div className="callout-title">Why This Matters</div>
          <div className="callout-body">Correct schema detection ensures downstream feature engineering and model training use the right columns as inputs vs. targets.</div>
        </div>
      </>
    ),
  },
  {
    title: 'Data Cleaning',
    icon: '🧹',
    content: (
      <>
        <p>Real-world pharmacological datasets often have missing values and outliers due to experimental noise.</p>
        <div className="callout warning mt-12">
          <div className="callout-title">Common Issues</div>
          <div className="callout-body">
            • Missing IC50 values (experiment didn't converge)<br />
            • Extreme outlier IC50 values ({'>'} 10× std dev)<br />
            • Inconsistent cell line names<br />
            • Duplicate drug–cell entries
          </div>
        </div>
        <div className="callout info mt-12">
          <div className="callout-title">Strategies Compared</div>
          <div className="callout-body">
            <strong>Drop NaN</strong>: Safest — removes incomplete rows. Loses data.<br /><br />
            <strong>Impute Median</strong>: Fills gaps with median value. Robust to outliers. Good default.<br /><br />
            <strong>Impute Mean</strong>: Fills gaps with mean. Sensitive to skewed distributions.
          </div>
        </div>
      </>
    ),
  },
  {
    title: 'Feature Engineering',
    icon: '⚙️',
    content: (
      <>
        <p>Raw column values often need transformation before ML models can learn from them effectively.</p>
        <div className="callout info mt-12">
          <div className="callout-title">Log-Transform IC50</div>
          <div className="callout-body">IC50 values span orders of magnitude (0.001 to 10,000 μM). Applying <code>log1p(IC50)</code> compresses this range, making the distribution more Gaussian and improving model convergence.</div>
        </div>
        <div className="callout info mt-12">
          <div className="callout-title">One-Hot Encoding</div>
          <div className="callout-body">Drug names and cell line names are categories. One-hot encoding converts them into binary columns (1 = present, 0 = absent), allowing ML models to learn drug- and cell-specific patterns.</div>
        </div>
        <div className="callout warning mt-12">
          <div className="callout-title">⚠ Dimensionality Warning</div>
          <div className="callout-body">One-hot encoding with 1000+ drugs or cell lines creates thousands of columns. This can cause <strong>the curse of dimensionality</strong>. The platform limits to ≤500 unique values.</div>
        </div>
      </>
    ),
  },
  {
    title: 'Model Training',
    icon: '🧠',
    content: (
      <>
        <p>Two tree-based ensemble models are available for regression tasks:</p>
        <div className="callout info mt-12">
          <div className="callout-title">Random Forest</div>
          <div className="callout-body">Builds many decision trees on random subsets of data and features, then averages predictions. Robust and interpretable. Good baseline. Less prone to overfitting.</div>
        </div>
        <div className="callout info mt-12">
          <div className="callout-title">XGBoost</div>
          <div className="callout-body">Gradient boosting builds trees sequentially, each correcting the previous one's errors. Generally more accurate than Random Forest but more prone to overfitting without tuning.</div>
        </div>
        <div className="callout danger mt-12">
          <div className="callout-title">🚨 Data Leakage Warning</div>
          <div className="callout-body">This platform uses <strong>random 80/20 train-test split</strong>. In real drug discovery, you must split by drug (drug-blind split) or cell line to test true generalization. Random split allows the model to "memorize" drug–cell pairs, inflating R².</div>
        </div>
      </>
    ),
  },
  {
    title: 'Evaluation Metrics',
    icon: '📏',
    content: (
      <>
        <p>After training, models are evaluated on the held-out 20% test set using five metrics:</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
          {[
            { m: 'R²', d: 'Proportion of variance explained. Range: (−∞, 1]. 1.0 = perfect, 0 = no better than mean, <0 = worse than mean. Green ≥0.7, Amber ≥0.4, Red <0.4.' },
            { m: 'MAE', d: 'Mean Absolute Error. Average of |y_true − y_pred|. Interpretable in the same units as the target.' },
            { m: 'RMSE', d: 'Root Mean Square Error. Penalizes large errors more than MAE. Also in target units.' },
            { m: 'Pearson r', d: 'Measures linear correlation between predictions and actual values. Range: [−1, 1].' },
            { m: 'Spearman ρ', d: 'Rank correlation — robust to outliers and non-linearity. Better for skewed IC50 distributions.' },
          ].map(item => (
            <div key={item.m} className="callout info" style={{ padding: '10px 14px' }}>
              <div className="callout-title">{item.m}</div>
              <div className="callout-body">{item.d}</div>
            </div>
          ))}
        </div>
      </>
    ),
  },
  {
    title: 'SHAP Explainability',
    icon: '🔍',
    content: (
      <>
        <p>Black-box ML models make accurate predictions but don't tell us <em>why</em>. SHAP solves this.</p>
        <div className="callout info mt-12">
          <div className="callout-title">How SHAP Works</div>
          <div className="callout-body">
            SHAP uses Shapley values from cooperative game theory. Imagine each feature as a "player" contributing to a team "score" (the prediction). SHAP fairly distributes the prediction among features based on their marginal contribution across all possible feature subsets.
          </div>
        </div>
        <div className="callout success mt-12">
          <div className="callout-title">Mean |SHAP| — Global Importance</div>
          <div className="callout-body">Taking the mean absolute SHAP value across all samples gives a global ranking of feature importance. This tells you which features <em>consistently</em> influence the model, regardless of direction.</div>
        </div>
        <div className="callout warning mt-12">
          <div className="callout-title">One-Hot Feature Interpretation</div>
          <div className="callout-body">If <code>drug_Erlotinib</code> has high SHAP importance, it means knowing "this is Erlotinib" strongly influences the predicted IC50 — the model has learned drug-specific sensitivity patterns.</div>
        </div>
      </>
    ),
  },
  {
    title: 'RAG-Powered Scientific Assistant',
    icon: '🤖',
    content: (
      <>
        <p>RAG (Retrieval-Augmented Generation) combines information retrieval with LLM generation:</p>
        <div className="callout info mt-12">
          <div className="callout-title">Web Search Mode</div>
          <div className="callout-body">
            1. Your question is sent to DuckDuckGo search<br />
            2. The top 5 results are fetched<br />
            3. Results are passed as context to Groq LLM (Llama3-70B)<br />
            4. The LLM generates a scientific answer grounded in current web sources
          </div>
        </div>
        <div className="callout info mt-12">
          <div className="callout-title">Local KB Mode</div>
          <div className="callout-body">
            1. Your question is embedded into a vector<br />
            2. FAISS performs semantic similarity search over your documents<br />
            3. Top-4 relevant chunks are retrieved<br />
            4. Groq LLM synthesizes an answer from those specific chunks
          </div>
        </div>
        <div className="callout success mt-12">
          <div className="callout-title">Why RAG over Pure LLM?</div>
          <div className="callout-body">RAG reduces hallucinations by grounding answers in real sources. The LLM is used for language understanding and synthesis, not as a knowledge store.</div>
        </div>
      </>
    ),
  },
]

export default function WorkshopPage() {
  const [step, setStep] = useState(0)

  return (
    <div className="page-wrapper fade-in">
      <div className="section-header">
        <h1 className="section-title">
          <div className="section-title-icon"><GraduationCap size={16} color="var(--cyan)" /></div>
          Workshop Mode
        </h1>
        <p className="section-desc">Step-by-step educational walkthrough of the drug–cell ML pipeline</p>
      </div>

      {/* Progress bar */}
      <div className="glass-card mb-24" style={{ padding: '16px 20px' }}>
        <div className="flex items-center justify-between mb-8">
          <span className="text-sm text-muted">Step {step + 1} of {STEPS.length}</span>
          <span className="badge badge-cyan">{Math.round(((step + 1) / STEPS.length) * 100)}% complete</span>
        </div>
        <div className="progress-bar-wrap">
          <div className="progress-bar-fill" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
        </div>
        {/* Step dots */}
        <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
          {STEPS.map((s, i) => (
            <button key={i} onClick={() => setStep(i)} title={s.title} style={{
              width: 28, height: 28, borderRadius: '50%', border: '2px solid',
              borderColor: i === step ? 'var(--cyan)' : i < step ? 'var(--emerald)' : 'var(--border-subtle)',
              background: i === step ? 'var(--cyan-dim)' : i < step ? 'var(--emerald-dim)' : 'transparent',
              cursor: 'pointer', fontSize: 12, color: i === step ? 'var(--cyan)' : i < step ? 'var(--emerald)' : 'var(--text-muted)',
              fontWeight: 700, transition: 'all 0.2s',
            }}>
              {i < step ? '✓' : i + 1}
            </button>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="glass-card mb-24 fade-in" key={step}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <span style={{ fontSize: 32 }}>{STEPS[step].icon}</span>
          <div>
            <div className="badge badge-violet mb-4">Step {step + 1}</div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3 }}>
              {STEPS[step].title}
            </h2>
          </div>
        </div>
        <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.75 }}>
          {STEPS[step].content}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center">
        <button className="btn btn-ghost" onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0}>
          <ChevronLeft size={14} /> Previous
        </button>
        <span className="text-sm text-muted">{STEPS[step].title}</span>
        <button className="btn btn-primary" onClick={() => setStep(s => Math.min(STEPS.length - 1, s + 1))} disabled={step === STEPS.length - 1}>
          Next Step <ChevronRight size={14} />
        </button>
      </div>
    </div>
  )
}
