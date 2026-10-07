import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

export interface ClientConfig {
  baseUrl: string;
  apiKey?: string;
  jwtToken?: string;
  relayUrl?: string; // e.g. https://cloud.tbzlabs.in/api/controltower
  relayApiKey?: string;
}

export class SynOSApiClient {
  private axiosInstance: AxiosInstance;
  private config: ClientConfig;

  constructor(config?: Partial<ClientConfig>) {
    this.config = {
      baseUrl: process.env.SYNOS_API_URL || config?.baseUrl || 'http://localhost:59999',
      apiKey: process.env.SYNOS_API_KEY || config?.apiKey,
      jwtToken: process.env.SYNOS_JWT_TOKEN || config?.jwtToken,
      relayUrl: process.env.SYNOS_RELAY_URL || config?.relayUrl || 'https://cloud.tbzlabs.in',
      relayApiKey: process.env.SYNOS_RELAY_API_KEY || config?.relayApiKey,
    };

    this.axiosInstance = axios.create({
      baseURL: this.config.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    this.axiosInstance.interceptors.request.use((req) => {
      if (this.config.jwtToken) {
        req.headers['Authorization'] = `Bearer ${this.config.jwtToken}`;
      }
      if (this.config.apiKey) {
        req.headers['X-Api-Key'] = this.config.apiKey;
      }
      return req;
    });
  }

  public setJwtToken(token: string) {
    this.config.jwtToken = token;
  }

  public setApiKey(key: string) {
    this.config.apiKey = key;
  }

  public setBaseUrl(url: string) {
    this.config.baseUrl = url;
    this.axiosInstance.defaults.baseURL = url;
  }

  /**
   * Dispatches an HTTP request either locally to Kestrel or via Cloud Relay if targetClientId is specified.
   */
  public async request<T = any>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
    path: string,
    data?: any,
    params?: any,
    targetClientId?: string,
    customHeaders?: Record<string, string>
  ): Promise<T> {
    // 1. If remote relay targeting is requested:
    if (targetClientId && targetClientId !== 'local') {
      return this.dispatchRelayCommand<T>(targetClientId, method, path, data, params);
    }

    // 2. Direct local/on-prem call:
    const config: AxiosRequestConfig = {
      method,
      url: path,
      data,
      params,
      headers: customHeaders,
    };

    try {
      const response = await this.axiosInstance.request<T>(config);
      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw new Error(
          `SynOS API Error [${error.response.status} ${error.response.statusText}]: ${
            typeof error.response.data === 'object'
              ? JSON.stringify(error.response.data)
              : error.response.data
          }`
        );
      }
      throw error;
    }
  }

  /**
   * Relay execution dispatch via TBZ Cloud Relay
   */
  private async dispatchRelayCommand<T = any>(
    targetClientId: string,
    method: string,
    path: string,
    data?: any,
    params?: any
  ): Promise<T> {
    const queueUrl = `${this.config.relayUrl}/api/commands/queue`;
    const payload = {
      CommandType: 'ExecuteApiOrAction',
      TargetClientId: targetClientId,
      Method: method,
      Path: path,
      Body: data,
      Params: params,
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.config.relayApiKey) {
      headers['X-Api-Key'] = this.config.relayApiKey;
    }

    try {
      const resp = await axios.post(
        queueUrl,
        {
          LabId: targetClientId,
          CommandType: 'ExecuteApiOrAction',
          PayloadJson: JSON.stringify(payload),
        },
        { headers, timeout: 30000 }
      );

      return resp.data as T;
    } catch (error: any) {
      if (error.response) {
        throw new Error(
          `Cloud Relay Error [${error.response.status}]: ${JSON.stringify(error.response.data)}`
        );
      }
      throw error;
    }
  }
}
