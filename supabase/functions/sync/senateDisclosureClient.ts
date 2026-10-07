import { DOMParser } from 'npm:linkedom@0.18.12/worker';
import { parseSenateSearch,senateDocumentUrl } from './senateDisclosureData.ts';

/** Normal public eFD agreement/cookie flow; never bypass access denials. */
export class SenateSession {
  private cookies=new Map<string,string>();
  constructor(private transport: typeof fetch=fetch) {}

  private async request(path: string,init: RequestInit={}) {
    const headers=new Headers(init.headers);
    headers.set('Cookie',[...this.cookies].map(([name,value])=>`${name}=${value}`).join('; '));
    const response=await this.transport(`https://efdsearch.senate.gov${path}`,
      {...init,headers,signal:AbortSignal.timeout(12000)});
    for(const cookie of response.headers.getSetCookie()) {
      const [name,...value]=cookie.split(';')[0].split('=');
      this.cookies.set(name,value.join('='));
    }
    return response;
  }

  private async text(response: Response) {
    if(!response.ok)throw new Error(`Oficjalny rejestr Senatu: HTTP ${response.status}`);
    const text=await response.text();
    if(text.length>2_000_000)throw new Error('Zbyt duża odpowiedź rejestru Senatu');
    return text;
  }

  async open() {
    const html=await this.text(await this.request('/search/home/'));
    const doc=new DOMParser().parseFromString(html,'text/html');
    const token=doc.querySelector('input[name="csrfmiddlewaretoken"]')?.getAttribute('value');
    const agreement=doc.querySelector('#agree_statement')?.getAttribute('value');
    if(!token || !agreement)throw new Error('Zmieniony formularz dostępu do rejestru Senatu');
    const response=await this.request('/search/home/',{method:'POST',redirect:'manual',headers:{
      Referer:'https://efdsearch.senate.gov/search/home/','Content-Type':'application/x-www-form-urlencoded'},
      body:new URLSearchParams({csrfmiddlewaretoken:token,prohibition_agreement:agreement})});
    const redirect=new URL(response.headers.get('location') ?? '', 'https://efdsearch.senate.gov/search/home/');
    if(![302,303].includes(response.status) || redirect.origin!=='https://efdsearch.senate.gov'
      || redirect.pathname!=='/search/')throw new Error('Nie zaakceptowano dostępu do publicznego rejestru Senatu');
    const search=await this.text(await this.request('/search/'));
    if(!search.includes('/search/report/data/'))throw new Error('Zmieniona wyszukiwarka Senatu');
  }

  async discover(startDate='01/01/2024') {
    const body=new URLSearchParams({draw:'1',start:'0',length:'25',report_types:'[11]',filer_types:'[1,5]',
      submitted_start_date:startDate,submitted_end_date:'',candidate_state:'',senator_state:'',office_id:'',
      first_name:'',last_name:'','search[value]':'','search[regex]':'false',
      'order[0][column]':'4','order[0][dir]':'desc'});
    for(let i=0;i<5;i++)for(const [key,value]of Object.entries({data:String(i),name:'',searchable:'true',
      orderable:'true','search[value]':'','search[regex]':'false'}))body.set(`columns[${i}][${key}]`,value);
    const response=await this.request('/search/report/data/',{method:'POST',headers:{
      Referer:'https://efdsearch.senate.gov/search/','X-CSRFToken':this.cookies.get('csrftoken') ?? '',
      'X-Requested-With':'XMLHttpRequest','Content-Type':'application/x-www-form-urlencoded'},body});
    return parseSenateSearch(JSON.parse(await this.text(response)));
  }

  async report(rawUrl: string) {
    const source=senateDocumentUrl(rawUrl);
    return this.text(await this.request(new URL(source.sourceUrl).pathname,
      {headers:{Referer:'https://efdsearch.senate.gov/search/'}}));
  }
}
