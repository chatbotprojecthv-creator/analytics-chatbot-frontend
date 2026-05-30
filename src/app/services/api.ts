import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface AskResponse {
  question: string;
  sql: string | null;
  summary: string;
  insights: any;
  chart: any;
  data: any[];
}

@Injectable({
  providedIn: 'root'
})
export class Api {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  askQuestion(client: string, question: string): Observable<AskResponse> {
    return this.http.post<AskResponse>(`${this.baseUrl}/ask`, {
      client,
      question
    });
  }
}