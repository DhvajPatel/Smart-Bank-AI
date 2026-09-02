import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export const client = axios.create({
  baseURL: API_URL,
  timeout: 30000,  // increased from 15s — SQLite can be slow on first query
});

// ---- Customers -----------------------------------------------------------

export const listCustomers = (params = {}) =>
  client.get("/customers", { params }).then((r) => r.data);

export const listCities = () =>
  client.get("/customers/cities").then((r) => r.data);

export const getCustomer = (customerId) =>
  client.get(`/customers/${customerId}`).then((r) => r.data);

export const getCustomerLoanProfile = (customerId) =>
  client.get(`/customers/${customerId}/loan-profile`).then((r) => r.data);

export const getCustomer360 = (customerId) =>
  client.get(`/customers/${customerId}/360`).then((r) => r.data);

export const getCustomerTransactions = (customerId, params = {}) =>
  client.get(`/customers/${customerId}/transactions`, { params }).then((r) => r.data);

export const getCustomerLoans = (customerId) =>
  client.get(`/customers/${customerId}/loans`).then((r) => r.data);

export const getCustomerCreditCards = (customerId) =>
  client.get(`/customers/${customerId}/credit-cards`).then((r) => r.data);

// ---- Analytics ------------------------------------------------------------

export const getFinancialHealth = (customerId) =>
  client.get(`/analytics/financial-health/${customerId}`).then((r) => r.data);

export const getSpending = (customerId, months = 3) =>
  client
    .get(`/analytics/spending/${customerId}`, { params: { months } })
    .then((r) => r.data);

export const getSpendingTrend = (customerId, months) =>
  client
    .get(`/analytics/spending-trend/${customerId}`, { params: { months } })
    .then((r) => r.data);

// ---- Loans ------------------------------------------------------------

export const predictLoan = (payload) =>
  client.post("/loans/predict", payload).then((r) => r.data);

// ---- Recommendations -------------------------------------------------------

export const getRecommendations = (customerId) =>
  client.get(`/recommendations/${customerId}`).then((r) => r.data);

// ---- Admin ------------------------------------------------------------

export const getStatistics = () =>
  client.get("/admin/statistics").then((r) => r.data);

export const getMarketingSegments = () =>
  client.get("/admin/marketing-segments").then((r) => r.data);

export const getCustomerAnalytics = () =>
  client.get("/admin/customer-analytics").then((r) => r.data);

export const getLoanAnalytics = () =>
  client.get("/admin/loan-analytics").then((r) => r.data);

export const getMarketingProspects = (params = {}) =>
  client.get("/admin/marketing-prospects", { params }).then((r) => r.data);

export const getModelMetrics = () =>
  client.get("/admin/model-metrics").then((r) => r.data);
