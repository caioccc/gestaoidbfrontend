import type { MeetingType } from '../../types';

export type MinutesTemplateLocale = 'pt-br' | 'en' | 'es';

export interface MinutesTemplate {
  id: string;
  meetingType?: MeetingType;
  title: Record<MinutesTemplateLocale, string>;
  description: Record<MinutesTemplateLocale, string>;
  preview: Record<MinutesTemplateLocale, string>;
  body: Record<MinutesTemplateLocale, string>;
}

export interface MinutesTemplateContext {
  date?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  churchName?: string | null;
  churchAddress?: string | null;
  cityUf?: string | null;
  president?: string | null;
  recorder?: string | null;
  local?: string | null;
  months: string[];
  locale: MinutesTemplateLocale;
}

const SIGNATURE_PRESIDENT: Record<MinutesTemplateLocale, string> = {
  'pt-br': 'Presidente da Reunião',
  en: 'Chairman of the Meeting',
  es: 'Presidente de la Reunión',
};

const SIGNATURE_SECRETARY: Record<MinutesTemplateLocale, string> = {
  'pt-br': 'Secretário(a)',
  en: 'Secretary',
  es: 'Secretario(a)',
};

export const TEMPLATES: MinutesTemplate[] = [
  {
    id: 'assembleia_geral',
    meetingType: 'ASSEMBLEIA_GERAL',
    title: {
      'pt-br': 'Assembleia Geral Ordinária',
      en: 'Ordinary General Meeting',
      es: 'Asamblea General Ordinaria',
    },
    description: {
      'pt-br': 'Aprovação de atas anteriores, relatórios anuais e prestação de contas da tesouraria.',
      en: 'Approval of previous minutes, annual reports and treasury accountability.',
      es: 'Aprobación de actas anteriores, informes anuales y rendición de cuentas de la tesorería.',
    },
    preview: {
      'pt-br': 'Abertura com oração, leitura da ata anterior, relatório financeiro, parecer do Conselho Fiscal e deliberações com votação.',
      en: 'Opening prayer, reading of previous minutes, financial report, Fiscal Council opinion and voted deliberations.',
      es: 'Apertura con oración, lectura del acta anterior, informe financiero, dictamen del Consejo Fiscal y deliberaciones con votación.',
    },
    body: {
      'pt-br': [
        'Aos {{DIA}} dias do mês de {{MES_EXTENSO}} do ano de {{ANO}}, às {{HORA}} horas, nas dependências da {{NOME_IGREJA}}, situada à {{ENDERECO_IGREJA}}, reuniu-se em Assembleia Geral Ordinária a membresia sob a presidência do(a) {{PRESIDENTE}}, tendo como secretário(a) ad-hoc o(a) {{REDATOR}}.',
        '',
        '1. DA ABERTURA E ORAÇÃO INICIAL:',
        'O Presidente declarou aberta a presente assembleia com a leitura da Palavra de Deus em [Texto Bíblico] e oração de louvor e gratidão.',
        '',
        '2. DA PAUTA DO DIA:',
        'A reunião foi convocada com a seguinte ordem do dia:',
        'a) Leitura e aprovação da ata anterior;',
        'b) Apresentação do relatório financeiro e balancete da tesouraria;',
        'c) Parecer do Conselho Fiscal;',
        'd) [Assuntos Gerais].',
        '',
        '3. DAS DELIBERAÇÕES E DECISÕES:',
        '[Descrever detalhadamente os pontos discutidos e o resultado das votações (aprovado por unanimidade ou maioria)].',
        '',
        '4. DO ENCERRAMENTO:',
        'Nada mais havendo a tratar, a presente reunião foi encerrada às {{HORA_TERMINO}} horas com oração final impetrada pelo(a) [Nome]. Eu, {{REDATOR}}, na qualidade de secretário(a), lavrei a presente ata que, após lida e considerada conforme, segue assinada por mim e pela presidência da mesa diretora.',
        '',
        '{{CIDADE_UF}}, {{DATA_FORMATADA}}.',
        '',
        '___________________________________________',
        '{{PRESIDENTE}}',
        'Presidente da Assembleia',
        '',
        '___________________________________________',
        '{{REDATOR}}',
        'Secretário(a)',
      ].join('\n'),
      en: [
        'On {{DATA_FORMATADA}} at {{HORA}}, at the premises of {{NOME_IGREJA}}, located at {{ENDERECO_IGREJA}}, the membership gathered in Ordinary General Meeting under the chairmanship of {{PRESIDENTE}}, with {{REDATOR}} acting as secretary.',
        '',
        '1. OPENING AND INITIAL PRAYER:',
        'The Chairman declared the meeting open with the reading of the Word of God from [Bible Passage] and a prayer of praise and thanksgiving.',
        '',
        '2. AGENDA:',
        'The meeting was convened with the following agenda:',
        'a) Reading and approval of the previous minutes;',
        'b) Presentation of the financial report and the treasury balance;',
        'c) Opinion of the Fiscal Council;',
        'd) [General Matters].',
        '',
        '3. DELIBERATIONS AND DECISIONS:',
        '[Describe in detail the points discussed and the result of the votes (approved unanimously or by majority)].',
        '',
        '4. CLOSING:',
        'There being nothing further to discuss, the meeting was closed at {{HORA_TERMINO}} with a closing prayer led by [Name]. I, {{REDATOR}}, as secretary, drew up these minutes which, after being read and considered in order, are signed by me and by the Chair of the board.',
        '',
        '{{CIDADE_UF}}, {{DATA_FORMATADA}}.',
        '',
        '___________________________________________',
        '{{PRESIDENTE}}',
        'Chairman of the Meeting',
        '',
        '___________________________________________',
        '{{REDATOR}}',
        'Secretary',
      ].join('\n'),
      es: [
        'A los {{DIA}} días del mes de {{MES_EXTENSO}} del año de {{ANO}}, a las {{HORA}} horas, en las dependencias de {{NOME_IGREJA}}, situada en {{ENDERECO_IGREJA}}, se reunió en Asamblea General Ordinaria la membresía bajo la presidencia de {{PRESIDENTE}}, teniendo como secretario(a) ad-hoc a {{REDATOR}}.',
        '',
        '1. DE LA APERTURA Y ORACIÓN INICIAL:',
        'El Presidente declaró abierta la presente asamblea con la lectura de la Palabra de Dios en [Texto Bíblico] y oración de alabanza y gratitud.',
        '',
        '2. DEL ORDEN DEL DÍA:',
        'La reunión fue convocada con el siguiente orden del día:',
        'a) Lectura y aprobación del acta anterior;',
        'b) Presentación del informe financiero y balance de la tesorería;',
        'c) Dictamen del Consejo Fiscal;',
        'd) [Asuntos Generales].',
        '',
        '3. DE LAS DELIBERACIONES Y DECISIONES:',
        '[Describir detalladamente los puntos discutidos y el resultado de las votaciones (aprobado por unanimidad o mayoría)].',
        '',
        '4. DEL CIERRE:',
        'No habiendo más asuntos que tratar, la presente reunión fue cerrada a las {{HORA_TERMINO}} horas con oración final a cargo de [Nombre]. Yo, {{REDATOR}}, en calidad de secretario(a), redacté la presente acta que, después de leída y considerada conforme, queda firmada por mí y por la presidencia de la mesa directiva.',
        '',
        '{{CIDADE_UF}}, {{DATA_FORMATADA}}.',
        '',
        '___________________________________________',
        '{{PRESIDENTE}}',
        'Presidente de la Asamblea',
        '',
        '___________________________________________',
        '{{REDATOR}}',
        'Secretario(a)',
      ].join('\n'),
    },
  },
  {
    id: 'assembleia_extraordinaria',
    meetingType: 'ASSEMBLEIA_EXTRAORDINARIA',
    title: {
      'pt-br': 'Assembleia Geral Extraordinária',
      en: 'Extraordinary General Meeting',
      es: 'Asamblea General Extraordinaria',
    },
    description: {
      'pt-br': 'Eleição de diretoria, reforma de estatuto, decisões patrimoniais e demais assuntos urgentes.',
      en: 'Election of the board, statutory amendment, property decisions and other urgent matters.',
      es: 'Elección de la directiva, reforma de estatutos, decisiones patrimoniales y demás asuntos urgentes.',
    },
    preview: {
      'pt-br': 'Convocação especial, pauta específica com votação, reforma de estatuto ou eleição de diretoria.',
      en: 'Special convening, specific agenda with voting, statutory amendment or board election.',
      es: 'Convocatoria especial, orden del día específico con votación, reforma de estatutos o elección de la directiva.',
    },
    body: {
      'pt-br': [
        'Aos {{DIA}} dias do mês de {{MES_EXTENSO}} do ano de {{ANO}}, às {{HORA}} horas, nas dependências da {{NOME_IGREJA}}, situada à {{ENDERECO_IGREJA}}, reuniu-se em Assembleia Geral Extraordinária a membresia, convocada especialmente para tratar do(s) seguinte(s) assunto(s), sob a presidência do(a) {{PRESIDENTE}} e com a secretaria do(a) {{REDATOR}}.',
        '',
        '1. DA CONVOCAÇÃO:',
        'A presente assembleia foi convocada nos termos do [Estatuto / Edital de Convocação], tendo por objeto: [Ex.: Eleição da diretoria; Reforma de estatuto; Decisões patrimoniais].',
        '',
        '2. DA ABERTURA E ORAÇÃO INICIAL:',
        'O Presidente declarou aberta a sessão com a leitura bíblica em [Texto Bíblico] e oração inicial proferida por [Nome].',
        '',
        '3. DAS DELIBERAÇÕES:',
        'a) [Ponto 1]: [Relatar discussões, propostas apresentadas e resultado da votação];',
        'b) [Ponto 2]: [Relatar discussões, propostas apresentadas e resultado da votação];',
        'c) [Ponto 3]: [Relatar discussões, propostas apresentadas e resultado da votação].',
        '',
        '4. DO ENCERRAMENTO:',
        'Nada mais havendo a tratar, a sessão foi encerrada às {{HORA_TERMINO}} horas com oração final [Nome]. Eu, {{REDATOR}}, na qualidade de secretário(a), lavrei a presente ata que, após lida e considerada conforme, segue assinada por mim e pelo Presidente da mesa.',
        '',
        '{{CIDADE_UF}}, {{DATA_FORMATADA}}.',
        '',
        '___________________________________________',
        '{{PRESIDENTE}}',
        'Presidente da Assembleia',
        '',
        '___________________________________________',
        '{{REDATOR}}',
        'Secretário(a)',
      ].join('\n'),
      en: [
        'On {{DATA_FORMATADA}} at {{HORA}}, at the premises of {{NOME_IGREJA}}, located at {{ENDERECO_IGREJA}}, the membership gathered in Extraordinary General Meeting, specially convened to deal with the following matters, under the chairmanship of {{PRESIDENTE}} and with {{REDATOR}} acting as secretary.',
        '',
        '1. CONVENING:',
        'This meeting was convened under the terms of the [Bylaws / Notice of Meeting], with the purpose of: [e.g., Election of the board; Statutory amendment; Property decisions].',
        '',
        '2. OPENING AND INITIAL PRAYER:',
        'The Chairman declared the session open with the reading of the Word of God from [Bible Passage] and an opening prayer led by [Name].',
        '',
        '3. DELIBERATIONS:',
        'a) [Item 1]: [Report discussions, proposals and the result of the vote];',
        'b) [Item 2]: [Report discussions, proposals and the result of the vote];',
        'c) [Item 3]: [Report discussions, proposals and the result of the vote].',
        '',
        '4. CLOSING:',
        'There being nothing further to discuss, the session was closed at {{HORA_TERMINO}} with a closing prayer [Name]. I, {{REDATOR}}, as secretary, drew up these minutes which, after being read and considered in order, are signed by me and by the Chair of the board.',
        '',
        '{{CIDADE_UF}}, {{DATA_FORMATADA}}.',
        '',
        '___________________________________________',
        '{{PRESIDENTE}}',
        'Chairman of the Meeting',
        '',
        '___________________________________________',
        '{{REDATOR}}',
        'Secretary',
      ].join('\n'),
      es: [
        'A los {{DIA}} días del mes de {{MES_EXTENSO}} del año de {{ANO}}, a las {{HORA}} horas, en las dependencias de {{NOME_IGREJA}}, situada en {{ENDERECO_IGREJA}}, se reunió en Asamblea General Extraordinaria la membresía, convocada especialmente para tratar el(los) siguiente(s) asunto(s), bajo la presidencia de {{PRESIDENTE}} y con la secretaría de {{REDATOR}}.',
        '',
        '1. DE LA CONVOCATORIA:',
        'La presente asamblea fue convocada según los términos del [Estatuto / Edicto de Convocatoria], teniendo por objeto: [Ej.: Elección de la directiva; Reforma de estatutos; Decisiones patrimoniales].',
        '',
        '2. DE LA APERTURA Y ORACIÓN INICIAL:',
        'El Presidente declaró abierta la sesión con la lectura bíblica en [Texto Bíblico] y oración inicial a cargo de [Nombre].',
        '',
        '3. DE LAS DELIBERACIONES:',
        'a) [Punto 1]: [Relatar discusiones, propuestas y resultado de la votación];',
        'b) [Punto 2]: [Relatar discusiones, propuestas y resultado de la votación];',
        'c) [Punto 3]: [Relatar discusiones, propuestas y resultado de la votación].',
        '',
        '4. DEL CIERRE:',
        'No habiendo más asuntos que tratar, la sesión fue cerrada a las {{HORA_TERMINO}} horas con oración final [Nombre]. Yo, {{REDATOR}}, en calidad de secretario(a), redacté la presente acta que, después de leída y considerada conforme, queda firmada por mí y por el Presidente de la mesa.',
        '',
        '{{CIDADE_UF}}, {{DATA_FORMATADA}}.',
        '',
        '___________________________________________',
        '{{PRESIDENTE}}',
        'Presidente de la Asamblea',
        '',
        '___________________________________________',
        '{{REDATOR}}',
        'Secretario(a)',
      ].join('\n'),
    },
  },
  {
    id: 'diretoria',
    meetingType: 'DIRETORIA',
    title: {
      'pt-br': 'Reunião de Diretoria',
      en: 'Board Meeting',
      es: 'Reunión de Directiva',
    },
    description: {
      'pt-br': 'Planejamento ministerial, decisões administrativas e alinhamentos da diretoria.',
      en: 'Ministerial planning, administrative decisions and board alignment.',
      es: 'Planificación ministerial, decisiones administrativas y alineación de la directiva.',
    },
    preview: {
      'pt-br': 'Abertura, pauta de planejamento, proposições da diretoria e encaminhamentos com responsáveis.',
      en: 'Opening, planning agenda, board proposals and follow-ups with responsible parties.',
      es: 'Apertura, agenda de planificación, propuestas de la directiva y seguimientos con responsables.',
    },
    body: {
      'pt-br': [
        'Aos {{DIA}} dias do mês de {{MES_EXTENSO}} do ano de {{ANO}}, às {{HORA}} horas, nas dependências da {{NOME_IGREJA}}, reuniu-se a Diretoria no exercício de suas atribuições, sob a coordenação do(a) {{PRESIDENTE}}, com a secretaria do(a) {{REDATOR}}.',
        '',
        '1. DA ABERTURA E ORAÇÃO INICIAL:',
        'A reunião foi aberta com leitura bíblica em [Texto Bíblico] e oração inicial por [Nome].',
        '',
        '2. DA PAUTA E PLANEJAMENTO:',
        'a) Informes e pendências da reunião anterior;',
        'b) Planejamento ministerial e calendário de atividades;',
        'c) Proposições, orçamento e prestação de contas;',
        'd) [Assuntos Gerais].',
        '',
        '3. DAS DECISÕES E ENCAMINHAMENTOS:',
        '[Registrar as decisões tomadas, os responsáveis e os prazos acordados].',
        '',
        '4. DO ENCERRAMENTO:',
        'Nada mais havendo a tratar, a reunião foi encerrada às {{HORA_TERMINO}} horas com oração final [Nome]. Eu, {{REDATOR}}, lavrei a presente ata, que segue assinada por mim e pelo(a) {{PRESIDENTE}}.',
        '',
        '{{CIDADE_UF}}, {{DATA_FORMATADA}}.',
        '',
        '___________________________________________',
        '{{PRESIDENTE}}',
        `${SIGNATURE_PRESIDENT['pt-br']}`,
        '',
        '___________________________________________',
        '{{REDATOR}}',
        `${SIGNATURE_SECRETARY['pt-br']}`,
      ].join('\n'),
      en: [
        'On {{DATA_FORMATADA}} at {{HORA}}, at the premises of {{NOME_IGREJA}}, the Board met in the exercise of its duties, under the coordination of {{PRESIDENTE}}, with {{REDATOR}} acting as secretary.',
        '',
        '1. OPENING AND INITIAL PRAYER:',
        'The meeting opened with the reading of the Word of God from [Bible Passage] and an opening prayer by [Name].',
        '',
        '2. AGENDA AND PLANNING:',
        'a) Updates and pending items from the previous meeting;',
        'b) Ministerial planning and activity calendar;',
        'c) Proposals, budget and accountability;',
        'd) [General Matters].',
        '',
        '3. DECISIONS AND FOLLOW-UPS:',
        '[Record the decisions taken, those responsible and the agreed deadlines].',
        '',
        '4. CLOSING:',
        'There being nothing further to discuss, the meeting was closed at {{HORA_TERMINO}} with a closing prayer [Name]. I, {{REDATOR}}, drew up these minutes, which are signed by me and by {{PRESIDENTE}}.',
        '',
        '{{CIDADE_UF}}, {{DATA_FORMATADA}}.',
        '',
        '___________________________________________',
        '{{PRESIDENTE}}',
        `${SIGNATURE_PRESIDENT.en}`,
        '',
        '___________________________________________',
        '{{REDATOR}}',
        `${SIGNATURE_SECRETARY.en}`,
      ].join('\n'),
      es: [
        'A los {{DIA}} días del mes de {{MES_EXTENSO}} del año de {{ANO}}, a las {{HORA}} horas, en las dependencias de {{NOME_IGREJA}}, se reunió la Directiva en ejercicio de sus atribuciones, bajo la coordinación de {{PRESIDENTE}}, con la secretaría de {{REDATOR}}.',
        '',
        '1. DE LA APERTURA Y ORACIÓN INICIAL:',
        'La reunión fue abierta con la lectura bíblica en [Texto Bíblico] y oración inicial a cargo de [Nombre].',
        '',
        '2. DEL ORDEN DEL DÍA Y PLANIFICACIÓN:',
        'a) Informes y pendientes de la reunión anterior;',
        'b) Planificación ministerial y calendario de actividades;',
        'c) Propuestas, presupuesto y rendición de cuentas;',
        'd) [Asuntos Generales].',
        '',
        '3. DE LAS DECISIONES Y SEGUIMIENTOS:',
        '[Registrar las decisiones tomadas, los responsables y los plazos acordados].',
        '',
        '4. DEL CIERRE:',
        'No habiendo más asuntos que tratar, la reunión fue cerrada a las {{HORA_TERMINO}} horas con oración final [Nombre]. Yo, {{REDATOR}}, redacté la presente acta, que queda firmada por mí y por {{PRESIDENTE}}.',
        '',
        '{{CIDADE_UF}}, {{DATA_FORMATADA}}.',
        '',
        '___________________________________________',
        '{{PRESIDENTE}}',
        `${SIGNATURE_PRESIDENT.es}`,
        '',
        '___________________________________________',
        '{{REDATOR}}',
        `${SIGNATURE_SECRETARY.es}`,
      ].join('\n'),
    },
  },
  {
    id: 'conselho_fiscal',
    meetingType: 'CONSELHO',
    title: {
      'pt-br': 'Reunião do Conselho Fiscal',
      en: 'Fiscal Council Meeting',
      es: 'Reunión del Consejo Fiscal',
    },
    description: {
      'pt-br': 'Conferência de balancetes, livros contábeis e emissão de parecer sobre a prestação de contas.',
      en: 'Review of balances, accounting books and opinion on the accountability report.',
      es: 'Conferencia de balances, libros contables y dictamen sobre la rendición de cuentas.',
    },
    preview: {
      'pt-br': 'Exame dos livros e balancetes da tesouraria, considerações do Conselho e parecer final.',
      en: 'Examination of the treasury books and balances, Council considerations and final opinion.',
      es: 'Examen de los libros y balances de la tesorería, consideraciones del Consejo y dictamen final.',
    },
    body: {
      'pt-br': [
        'Aos {{DIA}} dias do mês de {{MES_EXTENSO}} do ano de {{ANO}}, às {{HORA}} horas, nas dependências da {{NOME_IGREJA}}, reuniu-se o Conselho Fiscal, sob a presidência do(a) {{PRESIDENTE}}, com a secretaria do(a) {{REDATOR}}, para o exame das contas e da prestação de responsabilidade da tesouraria.',
        '',
        '1. DA ABERTURA E ORAÇÃO INICIAL:',
        'A reunião foi aberta com oração inicial por [Nome] e declaração dos trabalhos pelo(a) Presidente.',
        '',
        '2. DO EXAME DOS LIVROS E BALANCETES:',
        'O Conselho procedeu à conferência dos livros contábeis e dos balancetes apresentados pela tesouraria, relativos ao período [Período], verificando-se a documentação de suporte das receitas e despesas.',
        '',
        '3. DAS CONSIDERAÇÕES E PARECER:',
        'Concluída a conferência, o Conselho decidiu [aprovar/rejeitar] as contas apresentadas, nos seguintes termos: [registrar considerações, ressalvas ou recomendações].',
        '',
        '4. DO ENCERRAMENTO:',
        'Nada mais havendo a tratar, a reunião foi encerrada às {{HORA_TERMINO}} horas. Eu, {{REDATOR}}, lavrei a presente ata, que segue assinada por mim e pelo(a) {{PRESIDENTE}}.',
        '',
        '{{CIDADE_UF}}, {{DATA_FORMATADA}}.',
        '',
        '___________________________________________',
        '{{PRESIDENTE}}',
        `${SIGNATURE_PRESIDENT['pt-br']}`,
        '',
        '___________________________________________',
        '{{REDATOR}}',
        `${SIGNATURE_SECRETARY['pt-br']}`,
      ].join('\n'),
      en: [
        'On {{DATA_FORMATADA}} at {{HORA}}, at the premises of {{NOME_IGREJA}}, the Fiscal Council met under the chairmanship of {{PRESIDENTE}}, with {{REDATOR}} acting as secretary, to examine the accounts and the accountability of the treasury.',
        '',
        '1. OPENING AND INITIAL PRAYER:',
        'The meeting opened with a prayer by [Name] and the declaration of the work by the Chair.',
        '',
        '2. EXAMINATION OF BOOKS AND BALANCES:',
        'The Council reviewed the accounting books and the balances presented by the treasury, referring to the period [Period], verifying the supporting documentation of income and expenses.',
        '',
        '3. CONSIDERATIONS AND OPINION:',
        'After the review, the Council decided to [approve/reject] the accounts presented, on the following terms: [record considerations, reservations or recommendations].',
        '',
        '4. CLOSING:',
        'There being nothing further to discuss, the meeting was closed at {{HORA_TERMINO}}. I, {{REDATOR}}, drew up these minutes, which are signed by me and by {{PRESIDENTE}}.',
        '',
        '{{CIDADE_UF}}, {{DATA_FORMATADA}}.',
        '',
        '___________________________________________',
        '{{PRESIDENTE}}',
        `${SIGNATURE_PRESIDENT.en}`,
        '',
        '___________________________________________',
        '{{REDATOR}}',
        `${SIGNATURE_SECRETARY.en}`,
      ].join('\n'),
      es: [
        'A los {{DIA}} días del mes de {{MES_EXTENSO}} del año de {{ANO}}, a las {{HORA}} horas, en las dependencias de {{NOME_IGREJA}}, se reunió el Consejo Fiscal, bajo la presidencia de {{PRESIDENTE}}, con la secretaría de {{REDATOR}}, para el examen de las cuentas y de la rendición de cuentas de la tesorería.',
        '',
        '1. DE LA APERTURA Y ORACIÓN INICIAL:',
        'La reunión fue abierta con oración inicial a cargo de [Nombre] y declaración de los trabajos por el Presidente.',
        '',
        '2. DEL EXAMEN DE LOS LIBROS Y BALANCES:',
        'El Consejo procedió a la conferencia de los libros contables y de los balances presentados por la tesorería, relativos al período [Período], verificándose la documentación de soporte de los ingresos y gastos.',
        '',
        '3. DE LAS CONSIDERACIONES Y DICTAMEN:',
        'Concluida la conferencia, el Consejo decidió [aprobar/rechazar] las cuentas presentadas, en los siguientes términos: [registrar consideraciones, reservas o recomendaciones].',
        '',
        '4. DEL CIERRE:',
        'No habiendo más asuntos que tratar, la reunión fue cerrada a las {{HORA_TERMINO}} horas. Yo, {{REDATOR}}, redacté la presente acta, que queda firmada por mí y por {{PRESIDENTE}}.',
        '',
        '{{CIDADE_UF}}, {{DATA_FORMATADA}}.',
        '',
        '___________________________________________',
        '{{PRESIDENTE}}',
        `${SIGNATURE_PRESIDENT.es}`,
        '',
        '___________________________________________',
        '{{REDATOR}}',
        `${SIGNATURE_SECRETARY.es}`,
      ].join('\n'),
    },
  },
  {
    id: 'lideranca',
    meetingType: 'OUTRO',
    title: {
      'pt-br': 'Reunião da Liderança / Departamentos',
      en: 'Leadership / Departments Meeting',
      es: 'Reunión de Liderazgo / Departamentos',
    },
    description: {
      'pt-br': 'Reunião ordinária da liderança ministerial e dos departamentos da igreja.',
      en: 'Ordinary meeting of ministerial leadership and church departments.',
      es: 'Reunión ordinaria del liderazgo ministerial y de los departamentos de la iglesia.',
    },
    preview: {
      'pt-br': 'Alinhamento ministerial, informes dos departamentos, calendário e encaminhamentos.',
      en: 'Ministerial alignment, department reports, calendar and follow-ups.',
      es: 'Alineación ministerial, informes de los departamentos, calendario y seguimientos.',
    },
    body: {
      'pt-br': [
        'Aos {{DIA}} dias do mês de {{MES_EXTENSO}} do ano de {{ANO}}, às {{HORA}} horas, nas dependências da {{NOME_IGREJA}}, reuniu-se a liderança ministerial e dos departamentos, sob a coordenação do(a) {{PRESIDENTE}}, com a secretaria do(a) {{REDATOR}}.',
        '',
        '1. DA ABERTURA E ORAÇÃO INICIAL:',
        'A reunião foi aberta com leitura bíblica em [Texto Bíblico] e oração inicial por [Nome].',
        '',
        '2. DA PAUTA:',
        'a) Alinhamento ministerial e visão da igreja;',
        'b) Informes dos departamentos e ministérios;',
        'c) Calendário, eventos e programações;',
        'd) [Assuntos Gerais].',
        '',
        '3. DAS DECISÕES E ENCAMINHAMENTOS:',
        '[Registrar as decisões tomadas, os responsáveis e os prazos acordados].',
        '',
        '4. DO ENCERRAMENTO:',
        'Nada mais havendo a tratar, a reunião foi encerrada às {{HORA_TERMINO}} horas com oração final [Nome]. Eu, {{REDATOR}}, lavrei a presente ata, que segue assinada por mim e pelo(a) {{PRESIDENTE}}.',
        '',
        '{{CIDADE_UF}}, {{DATA_FORMATADA}}.',
        '',
        '___________________________________________',
        '{{PRESIDENTE}}',
        `${SIGNATURE_PRESIDENT['pt-br']}`,
        '',
        '___________________________________________',
        '{{REDATOR}}',
        `${SIGNATURE_SECRETARY['pt-br']}`,
      ].join('\n'),
      en: [
        'On {{DATA_FORMATADA}} at {{HORA}}, at the premises of {{NOME_IGREJA}}, the ministerial leadership and departments met, under the coordination of {{PRESIDENTE}}, with {{REDATOR}} acting as secretary.',
        '',
        '1. OPENING AND INITIAL PRAYER:',
        'The meeting opened with the reading of the Word of God from [Bible Passage] and an opening prayer by [Name].',
        '',
        '2. AGENDA:',
        'a) Ministerial alignment and church vision;',
        'b) Reports from departments and ministries;',
        'c) Calendar, events and programming;',
        'd) [General Matters].',
        '',
        '3. DECISIONS AND FOLLOW-UPS:',
        '[Record the decisions taken, those responsible and the agreed deadlines].',
        '',
        '4. CLOSING:',
        'There being nothing further to discuss, the meeting was closed at {{HORA_TERMINO}} with a closing prayer [Name]. I, {{REDATOR}}, drew up these minutes, which are signed by me and by {{PRESIDENTE}}.',
        '',
        '{{CIDADE_UF}}, {{DATA_FORMATADA}}.',
        '',
        '___________________________________________',
        '{{PRESIDENTE}}',
        `${SIGNATURE_PRESIDENT.en}`,
        '',
        '___________________________________________',
        '{{REDATOR}}',
        `${SIGNATURE_SECRETARY.en}`,
      ].join('\n'),
      es: [
        'A los {{DIA}} días del mes de {{MES_EXTENSO}} del año de {{ANO}}, a las {{HORA}} horas, en las dependencias de {{NOME_IGREJA}}, se reunió el liderazgo ministerial y los departamentos, bajo la coordinación de {{PRESIDENTE}}, con la secretaría de {{REDATOR}}.',
        '',
        '1. DE LA APERTURA Y ORACIÓN INICIAL:',
        'La reunión fue abierta con la lectura bíblica en [Texto Bíblico] y oración inicial a cargo de [Nombre].',
        '',
        '2. DEL ORDEN DEL DÍA:',
        'a) Alineación ministerial y visión de la iglesia;',
        'b) Informes de los departamentos y ministerios;',
        'c) Calendario, eventos y programaciones;',
        'd) [Asuntos Generales].',
        '',
        '3. DE LAS DECISIONES Y SEGUIMIENTOS:',
        '[Registrar las decisiones tomadas, los responsables y los plazos acordados].',
        '',
        '4. DEL CIERRE:',
        'No habiendo más asuntos que tratar, la reunión fue cerrada a las {{HORA_TERMINO}} horas con oración final [Nombre]. Yo, {{REDATOR}}, redacté la presente acta, que queda firmada por mí y por {{PRESIDENTE}}.',
        '',
        '{{CIDADE_UF}}, {{DATA_FORMATADA}}.',
        '',
        '___________________________________________',
        '{{PRESIDENTE}}',
        `${SIGNATURE_PRESIDENT.es}`,
        '',
        '___________________________________________',
        '{{REDATOR}}',
        `${SIGNATURE_SECRETARY.es}`,
      ].join('\n'),
    },
  },
];

export function minutesTemplateById(id: string): MinutesTemplate | undefined {
  return TEMPLATES.find((t) => t.id === id);
}

function parseISODate(iso: string): Date | null {
  const [y, m, d] = iso.split('-').map(Number);
  return y && m && d ? new Date(y, m - 1, d) : null;
}

function formatLongDate(date: Date, locale: MinutesTemplateLocale): string {
  const map: Record<MinutesTemplateLocale, string> = {
    'pt-br': 'pt-BR',
    en: 'en-US',
    es: 'es-ES',
  };
  try {
    return new Intl.DateTimeFormat(map[locale], {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
  } catch {
    return date.toLocaleDateString(map[locale]);
  }
}

export function interpolateMinutesTemplate(
  body: string,
  ctx: MinutesTemplateContext,
): string {
  if (!body) return '';
  const date = ctx.date ? parseISODate(ctx.date) : null;
  const day = date ? String(date.getDate()).padStart(2, '0') : '';
  const month = date ? ctx.months[date.getMonth()] || '' : '';
  const monthExtense = month
    ? ctx.locale === 'pt-br'
      ? month.toLowerCase()
      : month
    : '';
  const year = date ? String(date.getFullYear()) : '';
  const dataFormatada = date ? formatLongDate(date, ctx.locale) : '';

  const values: Record<string, string | undefined> = {
    DIA: day,
    MES_EXTENSO: monthExtense,
    ANO: year,
    DATA_FORMATADA: dataFormatada,
    HORA: ctx.startTime || undefined,
    HORA_TERMINO: ctx.endTime || undefined,
    HORARIO_FIM: ctx.endTime || undefined,
    NOME_IGREJA: ctx.churchName || undefined,
    ENDERECO_IGREJA: ctx.churchAddress || undefined,
    CIDADE_UF: ctx.cityUf || undefined,
    PRESIDENTE: ctx.president || undefined,
    REDATOR: ctx.recorder || undefined,
    LOCAL: ctx.local || undefined,
  };

  let out = body;
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) continue;
    out = out.split(`{{${key}}}`).join(value);
  }
  return out;
}

export function bodyToHtml(text: string): string {
  const lines = text.split(/\r?\n/);
  const blocks: string[] = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (/_{3,}/.test(line)) {
      blocks.push(`<p style="text-align:center">${line}</p>`);
    } else if (/^\d+\.\s/.test(line)) {
      blocks.push(`<p><strong>${line}</strong></p>`);
    } else {
      blocks.push(`<p>${line}</p>`);
    }
  }
  return blocks.join('');
}

export function striphtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

export const HTML_SEPARATOR = '<hr/>';