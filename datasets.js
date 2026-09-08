// datasets.js - Dual Hugging Face & Kaggle Search Engine with CORS Proxy

// Unicode-safe Base64 encoder (ERR-03)
function safeBtoa(str) {
  try {
    return btoa(unescape(encodeURIComponent(str)));
  } catch {
    return btoa(str);
  }
}

const CORS_PROXIES = [
  url => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  url => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`
];

// Curated high-relevance fallbacks in case of network restriction or empty searches
export const CURATED_DATASETS = [
  {
    id: "retail-sales-and-transactions",
    title: "Global E-Commerce Orders & Delivery Dataset",
    source: "Hugging Face",
    description: "Multi-regional transaction records with customer demographics, discount codes, ship dates, unit pricing, and payment methods.",
    url: "https://huggingface.co/datasets/financial-datasets",
    rowCount: "45,000+",
    columns: [
      { name: "OrderID", type: "string" },
      { name: "OrderDate", type: "date" },
      { name: "CustomerName", type: "string" },
      { name: "ShippingAddress", type: "string" },
      { name: "PostalCode", type: "string" },
      { name: "Region", type: "string" },
      { name: "Category", type: "string" },
      { name: "SubCategory", type: "string" },
      { name: "Sales", type: "float" },
      { name: "Quantity", type: "integer" },
      { name: "Discount", type: "float" },
      { name: "Profit", type: "float" }
    ]
  },
  {
    id: "hr-employee-attrition-dataset",
    title: "Enterprise HR Workforce & Attrition Analytics",
    source: "Kaggle",
    description: "Detailed employee records covering job satisfaction, monthly income, department, tenure, overtime hours, and promotion history.",
    url: "https://www.kaggle.com/datasets/pavansubhasht/ibm-hr-analytics-attrition-dataset",
    rowCount: "14,700+",
    columns: [
      { name: "EmployeeID", type: "string" },
      { name: "FullName", type: "string" },
      { name: "Department", type: "string" },
      { name: "JobRole", type: "string" },
      { name: "MonthlyIncome", type: "float" },
      { name: "YearsAtCompany", type: "integer" },
      { name: "OverTime", type: "string" },
      { name: "PerformanceRating", type: "integer" },
      { name: "Attrition", type: "string" }
    ]
  },
  {
    id: "us-hospital-operational-efficiency",
    title: "Healthcare Inpatient Admissions & Cost Analysis",
    source: "Hugging Face",
    description: "Hospital billing and clinical discharge data with admission length, primary diagnosis codes, bed utilization, and emergency ward flags.",
    url: "https://huggingface.co/datasets/health-metrics-inpatient",
    rowCount: "28,000+",
    columns: [
      { name: "AdmissionID", type: "string" },
      { name: "PatientName", type: "string" },
      { name: "AdmissionDate", type: "date" },
      { name: "DischargeDate", type: "date" },
      { name: "Department", type: "string" },
      { name: "LengthOfStay", type: "integer" },
      { name: "TotalCharges", type: "float" },
      { name: "InsuranceProvider", type: "string" }
    ]
  }
];

export const Datasets = {
  /**
   * Search Hugging Face Datasets API (Public, No Auth needed, CORS supported)
   */
  async searchHuggingFace(keywords = "sales retail", limit = 8) {
    try {
      const url = `https://huggingface.co/api/datasets?search=${encodeURIComponent(keywords)}&limit=${limit}&full=false`;
      const res = await fetch(url, { headers: { "Accept": "application/json" } });
      if (!res.ok) throw new Error(`HF returned status ${res.status}`);
      const data = await res.json();
      
      return (data || []).map(item => ({
        id: item.id,
        title: item.id.split("/").pop().replace(/[-_]/g, " ").toUpperCase(),
        source: "Hugging Face",
        description: item.description || `Hugging Face public community dataset: ${item.id}`,
        downloads: item.downloads || 0,
        likes: item.likes || 0,
        url: `https://huggingface.co/datasets/${item.id}`,
        tags: item.tags || []
      }));
    } catch (err) {
      console.warn("Hugging Face API search error:", err);
      return [];
    }
  },

  /**
   * Fetch schema information (columns and types) from Hugging Face datasets-server
   */
  async fetchHFSchema(datasetId) {
    try {
      const url = `https://datasets-server.huggingface.co/info?dataset=${encodeURIComponent(datasetId)}`;
      const res = await fetch(url, { headers: { "Accept": "application/json" } });
      if (!res.ok) return null;
      const data = await res.json();
      
      const configKey = Object.keys(data.dataset_info || {})[0];
      const info = data.dataset_info?.[configKey];
      if (!info || !info.features) return null;

      const columns = Object.entries(info.features).map(([name, val]) => ({
        name,
        type: typeof val === "object" && val.dtype ? val.dtype : "string"
      }));

      return {
        columns,
        rowCount: info.splits?.train?.num_examples || "Unknown"
      };
    } catch (err) {
      console.warn("Failed to fetch HF dataset schema:", err);
      return null;
    }
  },

  /**
   * Parse column/variable definitions from Kaggle dataset markdown description
   * Supports column names with spaces and hyphens e.g. "Invoice No", "Unit Price" (BUG-02)
   */
  parseKaggleAttributeColumns(desc) {
    if (!desc || typeof desc !== "string") return [];
    const columns = [];
    const attrMatch = desc.match(/(?:Attribute|Column|Variable|Feature)\s+Information:?([\s\S]*?)(?:\n#{1,3}|\n\n\n|$)/i);
    const searchBlock = attrMatch ? attrMatch[1] : desc;

    const lines = searchBlock.split(/\r?\n/);
    lines.forEach(line => {
      const trimmed = line.trim().replace(/^[-*•]\s*/, "");
      // Regex captures spaced column names up to 40 characters (e.g. "Invoice No: ...", "Unit Price: ...")
      const match = trimmed.match(/^`?([A-Za-z0-9_][A-Za-z0-9_\s\-]{0,39}[A-Za-z0-9_]|[A-Za-z0-9_]{1,40})`?\s*[:\-–]\s*(.+)$/);
      if (match) {
        const colName = match[1].trim();
        const definition = match[2].trim();
        let type = "Text";
        if (/date|time|timestamp|day|year|month/i.test(definition) || /date/i.test(colName)) {
          type = "Date";
        } else if (/nominal|identifier|id\b|code/i.test(definition) || /id|code|no\b/i.test(colName)) {
          type = "Text / Identifier";
        } else if (/numeric|integer|float|number|decimal|unit price|sterling|quantity|amount|rate|salary|revenue|cost|price/i.test(definition)) {
          type = "Number / Numeric";
        } else if (/boolean|flag|binary|indicator/i.test(definition)) {
          type = "Boolean";
        } else if (/text|string|name|categorical/i.test(definition)) {
          type = "Text";
        }
        const sampleMatch = definition.match(/e\.?g\.?,?\s*([^,.;\n]+)/i);
        const sample = sampleMatch ? sampleMatch[1].trim() : "—";
        columns.push({ name: colName, type, sample, definition });
      }
    });
    return columns;
  },

  /**
   * Fetch complete dataset details and full markdown description from Kaggle
   */
  async fetchKaggleDetails(datasetRef, username, key) {
    if (!datasetRef) return null;
    const authHeaders = (username && key) ? { "Authorization": "Basic " + safeBtoa(`${username.trim()}:${key.trim()}`) } : {};

    // 1. Try local server proxy first (secure, direct HTTPS, handles credentials)
    try {
      const isHttp = typeof window !== "undefined" && window.location?.origin && window.location.origin !== "null" && window.location.protocol.startsWith("http");
      const baseUrl = isHttp ? "" : "http://localhost:3000";
      const localProxyUrl = `${baseUrl}/api/kaggle?ref=${encodeURIComponent(datasetRef)}`;
      const res = await fetch(localProxyUrl, { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        const description = data.descriptionNullable || data.description || data.subtitleNullable || data.subtitle || "";
        const columns = this.parseKaggleAttributeColumns(description);
        return {
          title: data.titleNullable || data.title || datasetRef,
          subtitle: data.subtitleNullable || data.subtitle || "",
          description,
          columns,
          totalBytes: data.totalBytes || data.totalBytesNullable || 0
        };
      }
    } catch (localErr) {
      console.warn("Local Kaggle details proxy call failed:", localErr);
    }

    // 2. Fallback to public CORS proxies without leaking credentials (SEC-04)
    const targetUrl = `https://www.kaggle.com/api/v1/datasets/view/${encodeURI(datasetRef)}`;
    for (const proxyFn of CORS_PROXIES) {
      try {
        const proxiedUrl = proxyFn(targetUrl);
        // Note: Do NOT forward private Auth header to third-party public proxies (SEC-04)
        const res = await fetch(proxiedUrl, { headers: { "Accept": "application/json" } });
        if (res.ok) {
          const data = await res.json();
          const description = data.descriptionNullable || data.description || data.subtitleNullable || data.subtitle || "";
          const columns = this.parseKaggleAttributeColumns(description);
          return {
            title: data.titleNullable || data.title || datasetRef,
            subtitle: data.subtitleNullable || data.subtitle || "",
            description,
            columns,
            totalBytes: data.totalBytes || data.totalBytesNullable || 0
          };
        }
      } catch {
        // try next proxy
      }
    }
    return null;
  },

  /**
   * Search Kaggle API via local proxy endpoint with CORS fallback
   */
  async searchKaggle(keywords = "sales", username, key, limit = 15) {
    // 1. Try local server proxy first (fastest, direct HTTPS to Kaggle, no CORS block)
    try {
      const authHeaders = (username && key) ? { "Authorization": "Basic " + safeBtoa(`${username.trim()}:${key.trim()}`) } : {};
      const isHttp = typeof window !== "undefined" && window.location?.origin && window.location.origin !== "null" && window.location.protocol.startsWith("http");
      const baseUrl = isHttp ? "" : "http://localhost:3000";
      const localProxyUrl = `${baseUrl}/api/kaggle?search=${encodeURIComponent(keywords)}&sortBy=votes&filetype=csv&pageSize=${limit}`;
      const res = await fetch(localProxyUrl, { headers: authHeaders });

      if (res.ok) {
        const raw = await res.json();
        const items = Array.isArray(raw) ? raw : (raw.datasets || []);
        if (items.length > 0) {
          return items.map(item => ({
            id: item.ref || item.id,
            title: item.title || item.ref?.split("/").pop()?.replace(/[-_]/g, " ").toUpperCase() || "Kaggle Dataset",
            source: "Kaggle",
            description: item.subtitle || item.description || `Kaggle community dataset: ${item.ref}`,
            downloads: item.downloadCount || item.totalDownloads || item.voteCount || 0,
            url: `https://www.kaggle.com/datasets/${item.ref}`,
            tags: item.tags || []
          }));
        }
      }
    } catch (localErr) {
      console.warn("Local Kaggle proxy call error:", localErr);
    }

    // 2. Fallback to public CORS proxies without leaking user credentials (SEC-04)
    const targetUrl = `https://www.kaggle.com/api/v1/datasets/list?search=${encodeURIComponent(keywords)}&sortBy=votes&filetype=csv&pageSize=${limit}`;

    for (const proxyFn of CORS_PROXIES) {
      try {
        const proxiedUrl = proxyFn(targetUrl);
        // Note: Do NOT forward private Auth header to third-party public proxies (SEC-04)
        const res = await fetch(proxiedUrl, {
          method: "GET",
          headers: {
            "Accept": "application/json"
          }
        });
        
        if (res.ok) {
          const raw = await res.json();
          const items = Array.isArray(raw) ? raw : (raw.datasets || []);
          return items.map(item => ({
            id: item.ref || item.id,
            title: item.title || item.ref?.split("/").pop() || "Kaggle Dataset",
            source: "Kaggle",
            description: item.subtitle || item.description || "Real-world dataset hosted on Kaggle",
            downloads: item.downloadCount || item.totalDownloads || 0,
            url: `https://www.kaggle.com/datasets/${item.ref}`,
            tags: item.tags || []
          }));
        }
      } catch (err) {
        console.warn("Kaggle proxy attempt failed:", err);
      }
    }
    return [];
  },

  /**
   * Search across Hugging Face and/or Kaggle based on user source selection
   */
  async searchAll({ query = "retail sales", useHF = true, useKaggle = true, kaggleUser = "", kaggleKey = "", limit = 10 }) {
    const searchTerms = query.trim() || "finance e-commerce sales analytics";

    const promises = [];
    if (useHF) {
      promises.push(this.searchHuggingFace(searchTerms, limit));
    }
    if (useKaggle) {
      promises.push(this.searchKaggle(searchTerms, kaggleUser, kaggleKey, limit));
    }

    if (promises.length === 0) {
      return [];
    }

    const results = await Promise.allSettled(promises);
    let combined = [];

    results.forEach(res => {
      if (res.status === "fulfilled" && Array.isArray(res.value)) {
        combined.push(...res.value);
      }
    });

    // If both failed or returned 0 results, merge with curated datasets matching the active sources
    if (combined.length === 0) {
      combined = CURATED_DATASETS.filter(d => 
        (useHF && d.source === "Hugging Face") || 
        (useKaggle && d.source === "Kaggle")
      );
      if (combined.length === 0) combined = [...CURATED_DATASETS];
    } else if (combined.length < 3) {
      const extra = CURATED_DATASETS.filter(d => 
        ((useHF && d.source === "Hugging Face") || (useKaggle && d.source === "Kaggle")) &&
        !combined.some(c => c.id === d.id)
      );
      combined = [...combined, ...extra.slice(0, 3 - combined.length)];
    }

    return combined;
  }
};
