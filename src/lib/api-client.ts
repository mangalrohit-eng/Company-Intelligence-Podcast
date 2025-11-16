/**
 * API Client - Frontend wrapper for API calls
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

class ApiClient {
  private baseUrl: string;
  private token?: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  setToken(token: string) {
    this.token = token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(this.token && { Authorization: `Bearer ${this.token}` }),
      ...options.headers,
    };

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Podcasts
  async listPodcasts() {
    return this.request('/podcasts');
  }

  async getPodcast(id: string) {
    return this.request(`/podcasts/${id}`);
  }

  async createPodcast(data: any) {
    return this.request('/podcasts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updatePodcast(id: string, data: any) {
    return this.request(`/podcasts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // Runs
  async createRun(podcastId: string, flags?: any) {
    return this.request(`/podcasts/${podcastId}/runs`, {
      method: 'POST',
      body: JSON.stringify({ flags }),
    });
  }

  async getRun(runId: string) {
    return this.request(`/runs/${runId}`);
  }

  async getRunEvents(runId: string, limit = 100) {
    return this.request(`/runs/${runId}/events?limit=${limit}`);
  }

  async listRuns(podcastId: string) {
    return this.request(`/podcasts/${podcastId}/runs`);
  }

  // Episodes
  async getEpisode(episodeId: string) {
    return this.request(`/episodes/${episodeId}`);
  }

  async listEpisodes(podcastId: string) {
    return this.request(`/podcasts/${podcastId}/episodes`);
  }

  // AI Suggestions
  async suggestCompetitors(companyId: string, industryId: string) {
    return this.request('/podcasts/suggest/competitors', {
      method: 'POST',
      body: JSON.stringify({ companyId, industryId }),
    });
  }

  async suggestTopics(companyId: string, industryId: string, competitorIds: string[]) {
    return this.request('/podcasts/suggest/topics', {
      method: 'POST',
      body: JSON.stringify({ companyId, industryId, competitorIds }),
    });
  }

  // Admin
  async listAllRuns(filters?: any) {
    const params = new URLSearchParams(filters).toString();
    return this.request(`/admin/runs?${params}`);
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
export default apiClient;

