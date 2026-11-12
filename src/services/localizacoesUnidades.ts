import { LocalizacaoUnidade, RamalUnidade } from '@/types';

/**
 * Localização das unidades escolares (planilha maps.xlsx, links do Google Maps).
 * Coordenadas extraídas dos links; bairro e endereço pelo OpenStreetMap (podem faltar).
 * Chave: nome da unidade em ramais_unidades. O banco (colunas latitude/longitude/…)
 * tem prioridade; esta lista é o padrão e o modo demonstração.
 */
export const LOCALIZACOES_UNIDADES: Record<string, LocalizacaoUnidade> = {
  "C. M. SEN. TEOTÔNIO VILELLA": { lat: -22.8677957, lng: -43.7754865, bairro: "Centro", endereco: "Rua Alfredo Alves Cruz, Centro", mapa_url: "https://maps.app.goo.gl/Nzu3GTiVKnNKDkR3A" },
  "CEMAEE": { lat: -22.8745774, lng: -43.7758478, bairro: "Centro", endereco: "Centro", mapa_url: "https://maps.app.goo.gl/mSZ7bcLjNKhPjC8QA" },
  "CENTRO EDUCACIONAL DE ITAGUAI (CESMI)": { lat: -22.8686739, lng: -43.7889103, bairro: "Engenho", endereco: "Avenida Ary Parreiras, Engenho", mapa_url: "https://maps.app.goo.gl/w6ks1dgR1Y2aMN7M7" },
  "CIEP 300 M. PREF. VICENTE CICARINO": { lat: -22.8654497, lng: -43.7537378, bairro: null, endereco: "Estrada de Piranema", mapa_url: "https://maps.app.goo.gl/Z6PHfTS4EnJ9j4DV7" },
  "CIEP 496 M. MAESTRO F. MIGNONE": { lat: -22.874909, lng: -43.770482, bairro: null, endereco: "Rua Conde Mota Maia", mapa_url: "https://maps.app.goo.gl/Dxz4Vb2zkSKGv4Z48" },
  "CIEP 497 M. PROF.SILVIA TUPINAMBÁ": { lat: -22.8662757, lng: -43.7883906, bairro: "Engenho", endereco: "Rua Manoel Soares da Costa, Engenho", mapa_url: "https://maps.app.goo.gl/ABqwdMrox7gEEqSW7" },
  "CRECHE M. APARECIDA AZEDO": { lat: -22.8583508, lng: -43.7798694, bairro: "Vista Alegre", endereco: "Estrada dos Teixeiras, Vista Alegre", mapa_url: "https://maps.app.goo.gl/b1xG72mW4wLbA2Y99" },
  "CRECHE M. DANIELLE BATISTA DA SILVA": { lat: -22.8569569, lng: -43.7567421, bairro: "Chaperó", endereco: "Rua A, Chaperó", mapa_url: "https://maps.app.goo.gl/uC5md3vobZVWmRnN6" },
  "CRECHE M. EDSON CRUZ AMADO": { lat: -22.8734398, lng: -43.7642426, bairro: null, endereco: "Rua Argentina", mapa_url: "https://maps.app.goo.gl/tMUFkhCV6xxAKTNx6" },
  "CRECHE M. EUCLYDES JOSE BORGES": { lat: -22.858119, lng: -43.7858599, bairro: "Engenho", endereco: "Rua Salim Francisco do Nascimento, Engenho", mapa_url: "https://maps.app.goo.gl/oZcm9CFzwtWfw9uy5" },
  "CRECHE M. FLORENTINO ELIAS": { lat: -22.8185354, lng: -43.7597074, bairro: "Chaperó", endereco: "Rua Tulipas, Chaperó", mapa_url: "https://maps.app.goo.gl/UXXNLUWt5RQa3rQk6" },
  "CRECHE M. FRANCISCO XAVIER DE M. BRITO": { lat: -22.866785, lng: -43.788616, bairro: "Engenho", endereco: "Rua Manoel Soares da Costa, Engenho", mapa_url: "https://maps.app.goo.gl/AvoPoB9cX7UAmQvc9" },
  "CRECHE M. MARIA EDUVIGES DO ROSARIO SILVA": { lat: -22.883249, lng: -43.8180897, bairro: "Brisa Mar", endereco: "Rua Madalena Tortorelli, Brisa Mar", mapa_url: "https://maps.app.goo.gl/xA4ty9cA2ueU272D7" },
  "CRECHE M. MARIA ROSA G. DO NASCIMENTO": { lat: -22.8384411, lng: -43.7945529, bairro: "Teixeira", endereco: "Rua 3, Teixeira", mapa_url: "https://maps.app.goo.gl/aH42uwe4vPCiMRik8" },
  "CRECHE M. PROF. ELIANE LOPES BARBOSA": { lat: -22.8974334, lng: -43.8550543, bairro: "Vila Geny", endereco: "Rua Odilon Fenelon Fialho, Vila Geny", mapa_url: "https://maps.app.goo.gl/bRunyTBFWbnpGWJV8" },
  "CRECHE M. PROF. GOETHE COUTINHO MADRUGA": { lat: -22.8760968, lng: -43.7941122, bairro: "Jardim Itaguaí Mar", endereco: "Rua dos Coqueiros, Jardim Itaguaí Mar", mapa_url: "https://maps.app.goo.gl/aCFrbqLxqHLKfUd67" },
  "CRECHE M. PROF. JOAQUIM INOUE": { lat: -22.8090235, lng: -43.7595135, bairro: "Chaperó", endereco: "Rua Dezoito, Chaperó", mapa_url: "https://maps.app.goo.gl/wPUnKRsM6xHtYYsc8" },
  "CRECHE M. PROF. MARIA CRISTINA P. C. DA SILVA": { lat: -22.8617939, lng: -43.770806, bairro: null, endereco: "Rua Prefeito Jose de Moraes Dias", mapa_url: "https://maps.app.goo.gl/pc8vL72rfGM6pe8UA" },
  "CRECHE M. PROF. Mª DE LURDES SOUZA GARCIA": { lat: -22.8605146, lng: -43.7688067, bairro: null, endereco: "Avenida Baria", mapa_url: "https://maps.app.goo.gl/EEnSzXCaDUKowu8b8" },
  "CRECHE M. PROF. RENATO BARBOSA LADISLAU": { lat: -22.8692983, lng: -43.8085979, bairro: "Leandro", endereco: "Estrada do Mazomba, Leandro", mapa_url: "https://maps.app.goo.gl/4iLBqw9AqtieJBCf8" },
  "CRECHE M. PROF. TANIA MARA M. MENEZES": { lat: -22.8756426, lng: -43.8195003, bairro: "Chácaras Brisa Mar", endereco: "Rua 17, Chácaras Brisa Mar", mapa_url: "https://maps.app.goo.gl/BvLZRoPFyKxgevvw9" },
  "CRECHE M. PROF. TEREZINHA DE JESUS CAMPOS DE FARIAS": { lat: -22.838415, lng: -43.794701, bairro: "Teixeira", endereco: "Rua 3, Teixeira", mapa_url: "https://maps.app.goo.gl/r2SbgF1WUKQH4xi97" },
  "CRECHE M. RITA FERREIRA FEIJÓ": { lat: -22.89699, lng: -43.844415, bairro: "Somel", endereco: "Rua Guilherme Serrano, Somel", mapa_url: "https://maps.app.goo.gl/yg5C23nZsG3sdmDB6" },
  "CRECHE M. VER. JOSÉ ANTÔNIO CARRASCO": { lat: -22.8542866, lng: -43.7693697, bairro: "Estrela do Céu", endereco: "Estrela do Céu", mapa_url: "https://maps.app.goo.gl/M7MpUwkqq19YWSzF6" },
  "E. E. M. CAMILO CUQUEJO": { lat: -22.8445235, lng: -43.8582217, bairro: "Mazomba", endereco: "Estrada do Mazomba, Mazomba", mapa_url: "https://maps.app.goo.gl/3civiK6yGqvhNmwH7" },
  "E. E. M. CARMEM MENEZES DIREITO": { lat: -22.8778069, lng: -43.8136472, bairro: "Brisa Mar", endereco: "Rua Manoel Araujo Dos Santos, Brisa Mar", mapa_url: "https://maps.app.goo.gl/eiRKy3MHZTVRRw2J9" },
  "E. E. M. CHAPERÓ": { lat: -22.8032343, lng: -43.7789338, bairro: "Chaperó", endereco: "Rua Cinco, Chaperó", mapa_url: "https://maps.app.goo.gl/twNB9EQ2hdoeHP6P6" },
  "E. E. M. DRº JORGE ABRAHÃO": { lat: -22.8622688, lng: -43.8854982, bairro: "Mazomba", endereco: "Estrada do Mazomba, Mazomba", mapa_url: "https://maps.app.goo.gl/coupA8vE7vD4SeES8" },
  "E. E. M. FAZENDA SANTA CÂNDIDA": { lat: -22.8487804, lng: -43.8204122, bairro: "Santa Cândida", endereco: "Rua Guarani, Santa Cândida", mapa_url: "https://maps.app.goo.gl/G9hGaHcA5tuxVuzV8" },
  "E. E. M. SANTA ROSA": { lat: -22.8065586, lng: -43.7423286, bairro: "Chaperó", endereco: "Estrada Santa Rosa, Chaperó", mapa_url: "https://maps.app.goo.gl/nSjEyEvdQ2zPXt4c7", foto_url: "https://streetviewpixels-pa.googleapis.com/v1/thumbnail?panoid=VBfc6YtI6Cbm7UFnELOjKg&cb_client=maps_sv.tactile&w=800&h=480&yaw=18.43039&pitch=-0.4266729&thumbfov=100" },
  "E. E. M. TACIANO BASILIO": { lat: -22.7395634, lng: -43.8141954, bairro: "Ibituporanga", endereco: "Ibituporanga", mapa_url: "https://maps.app.goo.gl/R4BknkXd1HSSSCBo8" },
  "E. M. ALEXANDRE IGNÁCIO": { lat: -22.759181, lng: -43.788868, bairro: "Ibituporanga", endereco: "Ibituporanga", mapa_url: "https://maps.app.goo.gl/hRYs3fDFMRbC8Kbz7" },
  "E. M. AMAURI FERREIRA": { lat: -22.8964446, lng: -43.8445906, bairro: "Somel", endereco: "Rua Joaquim Conde, Somel", mapa_url: "https://maps.app.goo.gl/K9CQfh5uLS3KsKnB7" },
  "E. M. ANTÔNIO TUPINAMBÁ": { lat: -22.8678679, lng: -43.7923871, bairro: "Vila Margarida", endereco: "Rua Júlio Verne, Vila Margarida", mapa_url: "https://maps.app.goo.gl/Gm8SfBni7ckYArTA6" },
  "E. M. ARGENTINA COUTINHO": { lat: -22.8753518, lng: -43.8188538, bairro: "Chácaras Brisa Mar", endereco: "Rua Santa Maria, Chácaras Brisa Mar", mapa_url: "https://maps.app.goo.gl/8gCPa9Rt2JFYnwKT7" },
  "E. M. CORONEL ALZIRO SANTIAGO": { lat: -22.857697, lng: -43.8622784, bairro: "Mazomba", endereco: "Estrada do Mazomba, Mazomba", mapa_url: "https://maps.app.goo.gl/zjNt8RFL9CWXqjuu9" },
  "E. M. DAS ACÁCIAS": { lat: -22.8336604, lng: -43.766434, bairro: "Chaperó", endereco: "Rua Camélias, Chaperó", mapa_url: "https://maps.app.goo.gl/4oMYxrVG8g5BfHNdA" },
  "E. M. E. I. HYPOLITO VIEIRA DE CARVALHO": { lat: -22.8678169, lng: -43.7612953, bairro: null, endereco: "Rua Estados Unidos", mapa_url: "https://maps.app.goo.gl/TAWhXCABrXPzozbJA" },
  "E. M. E. I. MONTEIRO LOBATO": { lat: -22.8747203, lng: -43.7699899, bairro: null, endereco: "Rua Kaisser Abrão", mapa_url: "https://maps.app.goo.gl/JnGwN6Nxi4Rxph8s9" },
  "E. M. E. I. PREF. ISOLDACKSON C. BRITO": { lat: -22.8034663, lng: -43.7783147, bairro: "Chaperó", endereco: "Rua Cinco, Chaperó", mapa_url: "https://maps.app.goo.gl/iKFXZj2vYzgtTCj2A" },
  "E. M. EIDER RIBEIRO DANTAS": { lat: -22.8830913, lng: -43.8171876, bairro: "Brisa Mar", endereco: "Rua Praia Salina, Brisa Mar", mapa_url: "https://maps.app.goo.gl/AyTLmLJ7GUndtQpf7" },
  "E. M. ELMIRA FIGUEIRA": { lat: -22.8536018, lng: -43.7679798, bairro: "Chaperó", endereco: "Rua Tiete, Chaperó", mapa_url: "https://maps.app.goo.gl/5bM9cXe8fbpEP6Xy8" },
  "E. M. ELMO BAPTISTA COELHO": { lat: -22.9189018, lng: -43.8501279, bairro: "Ilha da Madeira", endereco: "Estrada Joaquim Fernandes, Ilha da Madeira", mapa_url: "https://maps.app.goo.gl/4EPqendF7YZaTXrs5" },
  "E. M. FUSAO FUKAMATI": { lat: -22.8088913, lng: -43.7597593, bairro: "Chaperó", endereco: "Rua Dezoito, Chaperó", mapa_url: "https://maps.app.goo.gl/EGmD6VckPjzEut2t7" },
  "E. M. JOAO VICENTE SOARES": { lat: -22.8605267, lng: -43.7687946, bairro: null, endereco: "Rua Macha do de Assis", mapa_url: "https://maps.app.goo.gl/2RPSX2N5mjiE4SYn6" },
  "E. M. JORGE FLORES DA SILVA": { lat: -22.8641878, lng: -43.8002398, bairro: "Ueda", endereco: "Estrada Ary Parreiras, Ueda", mapa_url: "https://maps.app.goo.gl/6iRM9zUkmMjdhCLj9" },
  "E. M. OSCAR JOSÉ DE SOUZA": { lat: -22.8646556, lng: -43.7555019, bairro: null, endereco: "Rua Vivail Silveira", mapa_url: "https://maps.app.goo.gl/QVerhE85urFqE5qc8" },
  "E. M. PADRE RAFAEL SCARFÓ": { lat: -22.8734326, lng: -43.7891333, bairro: "Vila Margarida", endereco: "Rua Elvira Ciuffo Cicanino, Vila Margarida", mapa_url: "https://maps.app.goo.gl/FrdgugaFvZyz4AF36" },
  "E. M. PREF. ABEILARD G. SOUZA": { lat: -22.8633069, lng: -43.7722655, bairro: null, endereco: "Rua Estudante Jefferson Catanhaok da Azevedo", mapa_url: "https://maps.app.goo.gl/SR3L98X4524RtvqQA" },
  "E. M. PREF. OTONI ROCHA": { lat: -22.8639055, lng: -43.7812101, bairro: "Centro", endereco: "Centro", mapa_url: "https://maps.app.goo.gl/9QJLKRgdbLkQqnnP8" },
  "E. M. PREF. WILSON PEDRO FRANCISCO": { lat: -22.8577943, lng: -43.7815438, bairro: "Vista Alegre", endereco: "Estrada dos Teixeiras, Vista Alegre", mapa_url: "https://maps.app.goo.gl/WUGBKGzcAd48yo2ZA" },
  "E. M. PROF YOLANDA RANGEL PEREIRA": { lat: -22.858352, lng: -43.7860809, bairro: "Engenho", endereco: "Rua Francisco Costa Pereira, Engenho", mapa_url: "https://maps.app.goo.gl/fBx5LZQiVsDj5K229" },
  "E. M. PROF. MARIANILDE SIQUEIRA GONÇALVES": { lat: -22.8760968, lng: -43.7941122, bairro: "Jardim Itaguaí Mar", endereco: "Rua dos Coqueiros, Jardim Itaguaí Mar", mapa_url: "https://maps.app.goo.gl/whHakaUFkAAUXoTp8" },
  "E. M. PROF. Mª GUILHERMINA DE S FREIRE": { lat: -22.8695694, lng: -43.808565, bairro: "Leandro", endereco: "Estrada do Mazomba, Leandro", mapa_url: "https://maps.app.goo.gl/RLFzYxGhQZUxL4JE7" },
  "E. M. PROF. SEVERINA DOS RAMOS DE SOUSA": { lat: -22.8994596, lng: -43.8617181, bairro: "Vila Geny", endereco: "Rua Evelin Reis, Vila Geny", mapa_url: "https://maps.app.goo.gl/QapeVQm6PZdB5peR8" },
  "E. M. RENATO GONÇALVES MARTINS": { lat: -22.8279491, lng: -43.744269, bairro: "Piranema", endereco: "Reta 800, Piranema", mapa_url: "https://maps.app.goo.gl/UVgiL6yZWK3ha7Vw7" },
  "E. M. SEVERINO SALUSTIANO DE FARIAS": { lat: -22.8387685, lng: -43.7944483, bairro: "Teixeira", endereco: "Estrada do Caçador, Teixeira", mapa_url: "https://maps.app.goo.gl/61PXHtL3B1s2uJmSA" },
  "E. M. SYLVIA SOUZA SIQUINELI": { lat: -22.8083498, lng: -43.7708415, bairro: "Chaperó", endereco: "Rua Cinco, Chaperó", mapa_url: "https://maps.app.goo.gl/oLigo6ZGmn2oeDC69" },
  "E. M. SÃO SEBASTIÃO": { lat: -22.811116, lng: -43.809423, bairro: "Raiz da Serra", endereco: "Raiz da Serra", mapa_url: "https://maps.app.goo.gl/1hvVKgBuz4kXxQR18" },
  "E. M. TEREZA DE ARAUJO SAGÁRIO": { lat: -22.8583942, lng: -43.7583999, bairro: null, endereco: "Rua Tabajara", mapa_url: "https://maps.app.goo.gl/DWk9XKsmSRuBbKp59" },
  "E. M. VER. AMÉRICO R. AMORIM": { lat: -22.903098, lng: -43.874651, bairro: "Itimirim", endereco: "Rua S, Itimirim", mapa_url: "https://maps.app.goo.gl/oXi6nxQj5Z8vbkX47" },
  "E. M. VER. JOSÉ GALLIAÇO PRATA": { lat: -22.8486472, lng: -43.7862035, bairro: "Amendoeira", endereco: "Rua C, Amendoeira", mapa_url: "https://maps.app.goo.gl/EzjwPT62M3y6feDg8" },
  "E. M. VER. PROFESSOR ARTHUR BRITO DE CASTRO": { lat: -22.838425, lng: -43.714736, bairro: "Piranema", endereco: "Rua Antonio M Rereira, Piranema", mapa_url: "https://maps.app.goo.gl/8JiaYt2Cw18kEs2M6" },
  "E. M. VER. TACIANO FERNANDES NUNES": { lat: -22.8730463, lng: -43.800151, bairro: "Brisa Mar", endereco: "Avenida Governador Mário Covas, Brisa Mar", mapa_url: "https://maps.app.goo.gl/QLxMXdv64HAbZhA2A" },
};

/** Todos os departamentos da SMEDU funcionam no mesmo prédio. */
export const LOCALIZACAO_DEPARTAMENTOS: LocalizacaoUnidade = {
  lat: -22.8686368970542,
  lng: -43.78889502338,
  bairro: 'Engenho',
  endereco: 'Rua Ary Parreiras, nº 1242',
  cep: '23820-380',
  mapa_url: 'https://maps.app.goo.gl/Pk8wnD23ZyUeiHwBA',
  foto_url: 'https://streetviewpixels-pa.googleapis.com/v1/thumbnail?panoid=jwBbo0RjJlhZnKB-LabdJg&cb_client=search.gws-prod.grass&w=408&h=240&yaw=321.9729&pitch=1.3461014&thumbfov=100',
};

/** Localização padrão da unidade: a do prédio da SMEDU para departamentos, a da planilha para escolas. */
export const localizacaoPadrao = (u: Pick<RamalUnidade, 'nome' | 'tipo'>): LocalizacaoUnidade | undefined =>
  u.tipo === 'departamento' ? LOCALIZACAO_DEPARTAMENTOS : LOCALIZACOES_UNIDADES[u.nome];
