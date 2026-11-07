-- Localização das unidades escolares para o Mapa Operacional da Rede (CCO, administrador).
-- Coordenadas dos links do Google Maps da planilha maps.xlsx; bairro/endereço pelo OpenStreetMap.

begin;

alter table public.ramais_unidades
  add column if not exists latitude double precision check (latitude between -90 and 90),
  add column if not exists longitude double precision check (longitude between -180 and 180),
  add column if not exists bairro text,
  add column if not exists endereco text,
  add column if not exists mapa_url text;

with planilha(nome, latitude, longitude, bairro, endereco, mapa_url) as (
  values
  ('C. M. SEN. TEOTÔNIO VILELLA', -22.8677957, -43.7754865, 'Centro', 'Rua Alfredo Alves Cruz, Centro', 'https://maps.app.goo.gl/Nzu3GTiVKnNKDkR3A'),
  ('CEMAEE', -22.8745774, -43.7758478, 'Centro', 'Centro', 'https://maps.app.goo.gl/mSZ7bcLjNKhPjC8QA'),
  ('CENTRO EDUCACIONAL DE ITAGUAI (CESMI)', -22.8686739, -43.7889103, 'Engenho', 'Avenida Ary Parreiras, Engenho', 'https://maps.app.goo.gl/w6ks1dgR1Y2aMN7M7'),
  ('CIEP 300 M. PREF. VICENTE CICARINO', -22.8654497, -43.7537378, null, 'Estrada de Piranema', 'https://maps.app.goo.gl/Z6PHfTS4EnJ9j4DV7'),
  ('CIEP 496 M. MAESTRO F. MIGNONE', -22.874909, -43.770482, null, 'Rua Conde Mota Maia', 'https://maps.app.goo.gl/Dxz4Vb2zkSKGv4Z48'),
  ('CIEP 497 M. PROF.SILVIA TUPINAMBÁ', -22.8662757, -43.7883906, 'Engenho', 'Rua Manoel Soares da Costa, Engenho', 'https://maps.app.goo.gl/ABqwdMrox7gEEqSW7'),
  ('CRECHE M. APARECIDA AZEDO', -22.8583508, -43.7798694, 'Vista Alegre', 'Estrada dos Teixeiras, Vista Alegre', 'https://maps.app.goo.gl/b1xG72mW4wLbA2Y99'),
  ('CRECHE M. DANIELLE BATISTA DA SILVA', -22.8569569, -43.7567421, 'Chaperó', 'Rua A, Chaperó', 'https://maps.app.goo.gl/uC5md3vobZVWmRnN6'),
  ('CRECHE M. EDSON CRUZ AMADO', -22.8734398, -43.7642426, null, 'Rua Argentina', 'https://maps.app.goo.gl/tMUFkhCV6xxAKTNx6'),
  ('CRECHE M. EUCLYDES JOSE BORGES', -22.858119, -43.7858599, 'Engenho', 'Rua Salim Francisco do Nascimento, Engenho', 'https://maps.app.goo.gl/oZcm9CFzwtWfw9uy5'),
  ('CRECHE M. FLORENTINO ELIAS', -22.8185354, -43.7597074, 'Chaperó', 'Rua Tulipas, Chaperó', 'https://maps.app.goo.gl/UXXNLUWt5RQa3rQk6'),
  ('CRECHE M. FRANCISCO XAVIER DE M. BRITO', -22.866785, -43.788616, 'Engenho', 'Rua Manoel Soares da Costa, Engenho', 'https://maps.app.goo.gl/AvoPoB9cX7UAmQvc9'),
  ('CRECHE M. MARIA EDUVIGES DO ROSARIO SILVA', -22.883249, -43.8180897, 'Brisa Mar', 'Rua Madalena Tortorelli, Brisa Mar', 'https://maps.app.goo.gl/xA4ty9cA2ueU272D7'),
  ('CRECHE M. MARIA ROSA G. DO NASCIMENTO', -22.8384411, -43.7945529, 'Teixeira', 'Rua 3, Teixeira', 'https://maps.app.goo.gl/aH42uwe4vPCiMRik8'),
  ('CRECHE M. PROF. ELIANE LOPES BARBOSA', -22.8974334, -43.8550543, 'Vila Geny', 'Rua Odilon Fenelon Fialho, Vila Geny', 'https://maps.app.goo.gl/bRunyTBFWbnpGWJV8'),
  ('CRECHE M. PROF. GOETHE COUTINHO MADRUGA', -22.8760968, -43.7941122, 'Jardim Itaguaí Mar', 'Rua dos Coqueiros, Jardim Itaguaí Mar', 'https://maps.app.goo.gl/aCFrbqLxqHLKfUd67'),
  ('CRECHE M. PROF. JOAQUIM INOUE', -22.8090235, -43.7595135, 'Chaperó', 'Rua Dezoito, Chaperó', 'https://maps.app.goo.gl/wPUnKRsM6xHtYYsc8'),
  ('CRECHE M. PROF. MARIA CRISTINA P. C. DA SILVA', -22.8617939, -43.770806, null, 'Rua Prefeito Jose de Moraes Dias', 'https://maps.app.goo.gl/pc8vL72rfGM6pe8UA'),
  ('CRECHE M. PROF. Mª DE LURDES SOUZA GARCIA', -22.8605146, -43.7688067, null, 'Avenida Baria', 'https://maps.app.goo.gl/EEnSzXCaDUKowu8b8'),
  ('CRECHE M. PROF. RENATO BARBOSA LADISLAU', -22.8692983, -43.8085979, 'Leandro', 'Estrada do Mazomba, Leandro', 'https://maps.app.goo.gl/4iLBqw9AqtieJBCf8'),
  ('CRECHE M. PROF. TANIA MARA M. MENEZES', -22.8756426, -43.8195003, 'Chácaras Brisa Mar', 'Rua 17, Chácaras Brisa Mar', 'https://maps.app.goo.gl/BvLZRoPFyKxgevvw9'),
  ('CRECHE M. PROF. TEREZINHA DE JESUS CAMPOS DE FARIAS', -22.838415, -43.794701, 'Teixeira', 'Rua 3, Teixeira', 'https://maps.app.goo.gl/r2SbgF1WUKQH4xi97'),
  ('CRECHE M. RITA FERREIRA FEIJÓ', -22.89699, -43.844415, 'Somel', 'Rua Guilherme Serrano, Somel', 'https://maps.app.goo.gl/yg5C23nZsG3sdmDB6'),
  ('CRECHE M. VER. JOSÉ ANTÔNIO CARRASCO', -22.8542866, -43.7693697, 'Estrela do Céu', 'Estrela do Céu', 'https://maps.app.goo.gl/M7MpUwkqq19YWSzF6'),
  ('E. E. M. CAMILO CUQUEJO', -22.8445235, -43.8582217, 'Mazomba', 'Estrada do Mazomba, Mazomba', 'https://maps.app.goo.gl/3civiK6yGqvhNmwH7'),
  ('E. E. M. CARMEM MENEZES DIREITO', -22.8778069, -43.8136472, 'Brisa Mar', 'Rua Manoel Araujo Dos Santos, Brisa Mar', 'https://maps.app.goo.gl/eiRKy3MHZTVRRw2J9'),
  ('E. E. M. CHAPERÓ', -22.8032343, -43.7789338, 'Chaperó', 'Rua Cinco, Chaperó', 'https://maps.app.goo.gl/twNB9EQ2hdoeHP6P6'),
  ('E. E. M. DRº JORGE ABRAHÃO', -22.8622688, -43.8854982, 'Mazomba', 'Estrada do Mazomba, Mazomba', 'https://maps.app.goo.gl/coupA8vE7vD4SeES8'),
  ('E. E. M. FAZENDA SANTA CÂNDIDA', -22.8487804, -43.8204122, 'Santa Cândida', 'Rua Guarani, Santa Cândida', 'https://maps.app.goo.gl/G9hGaHcA5tuxVuzV8'),
  ('E. E. M. SANTA ROSA', -22.8065586, -43.7423286, 'Chaperó', 'Estrada Santa Rosa, Chaperó', 'https://maps.app.goo.gl/nSjEyEvdQ2zPXt4c7'),
  ('E. E. M. TACIANO BASILIO', -22.7395634, -43.8141954, 'Ibituporanga', 'Ibituporanga', 'https://maps.app.goo.gl/R4BknkXd1HSSSCBo8'),
  ('E. M. ALEXANDRE IGNÁCIO', -22.759181, -43.788868, 'Ibituporanga', 'Ibituporanga', 'https://maps.app.goo.gl/hRYs3fDFMRbC8Kbz7'),
  ('E. M. AMAURI FERREIRA', -22.8964446, -43.8445906, 'Somel', 'Rua Joaquim Conde, Somel', 'https://maps.app.goo.gl/K9CQfh5uLS3KsKnB7'),
  ('E. M. ANTÔNIO TUPINAMBÁ', -22.8678679, -43.7923871, 'Vila Margarida', 'Rua Júlio Verne, Vila Margarida', 'https://maps.app.goo.gl/Gm8SfBni7ckYArTA6'),
  ('E. M. ARGENTINA COUTINHO', -22.8753518, -43.8188538, 'Chácaras Brisa Mar', 'Rua Santa Maria, Chácaras Brisa Mar', 'https://maps.app.goo.gl/8gCPa9Rt2JFYnwKT7'),
  ('E. M. CORONEL ALZIRO SANTIAGO', -22.857697, -43.8622784, 'Mazomba', 'Estrada do Mazomba, Mazomba', 'https://maps.app.goo.gl/zjNt8RFL9CWXqjuu9'),
  ('E. M. DAS ACÁCIAS', -22.8336604, -43.766434, 'Chaperó', 'Rua Camélias, Chaperó', 'https://maps.app.goo.gl/4oMYxrVG8g5BfHNdA'),
  ('E. M. E. I. HYPOLITO VIEIRA DE CARVALHO', -22.8678169, -43.7612953, null, 'Rua Estados Unidos', 'https://maps.app.goo.gl/TAWhXCABrXPzozbJA'),
  ('E. M. E. I. MONTEIRO LOBATO', -22.8747203, -43.7699899, null, 'Rua Kaisser Abrão', 'https://maps.app.goo.gl/JnGwN6Nxi4Rxph8s9'),
  ('E. M. E. I. PREF. ISOLDACKSON C. BRITO', -22.8034663, -43.7783147, 'Chaperó', 'Rua Cinco, Chaperó', 'https://maps.app.goo.gl/iKFXZj2vYzgtTCj2A'),
  ('E. M. EIDER RIBEIRO DANTAS', -22.8830913, -43.8171876, 'Brisa Mar', 'Rua Praia Salina, Brisa Mar', 'https://maps.app.goo.gl/AyTLmLJ7GUndtQpf7'),
  ('E. M. ELMIRA FIGUEIRA', -22.8536018, -43.7679798, 'Chaperó', 'Rua Tiete, Chaperó', 'https://maps.app.goo.gl/5bM9cXe8fbpEP6Xy8'),
  ('E. M. ELMO BAPTISTA COELHO', -22.9189018, -43.8501279, 'Ilha da Madeira', 'Estrada Joaquim Fernandes, Ilha da Madeira', 'https://maps.app.goo.gl/4EPqendF7YZaTXrs5'),
  ('E. M. FUSAO FUKAMATI', -22.8088913, -43.7597593, 'Chaperó', 'Rua Dezoito, Chaperó', 'https://maps.app.goo.gl/EGmD6VckPjzEut2t7'),
  ('E. M. JOAO VICENTE SOARES', -22.8605267, -43.7687946, null, 'Rua Macha do de Assis', 'https://maps.app.goo.gl/2RPSX2N5mjiE4SYn6'),
  ('E. M. JORGE FLORES DA SILVA', -22.8641878, -43.8002398, 'Ueda', 'Estrada Ary Parreiras, Ueda', 'https://maps.app.goo.gl/6iRM9zUkmMjdhCLj9'),
  ('E. M. OSCAR JOSÉ DE SOUZA', -22.8646556, -43.7555019, null, 'Rua Vivail Silveira', 'https://maps.app.goo.gl/QVerhE85urFqE5qc8'),
  ('E. M. PADRE RAFAEL SCARFÓ', -22.8734326, -43.7891333, 'Vila Margarida', 'Rua Elvira Ciuffo Cicanino, Vila Margarida', 'https://maps.app.goo.gl/FrdgugaFvZyz4AF36'),
  ('E. M. PREF. ABEILARD G. SOUZA', -22.8633069, -43.7722655, null, 'Rua Estudante Jefferson Catanhaok da Azevedo', 'https://maps.app.goo.gl/SR3L98X4524RtvqQA'),
  ('E. M. PREF. OTONI ROCHA', -22.8639055, -43.7812101, 'Centro', 'Centro', 'https://maps.app.goo.gl/9QJLKRgdbLkQqnnP8'),
  ('E. M. PREF. WILSON PEDRO FRANCISCO', -22.8577943, -43.7815438, 'Vista Alegre', 'Estrada dos Teixeiras, Vista Alegre', 'https://maps.app.goo.gl/WUGBKGzcAd48yo2ZA'),
  ('E. M. PROF YOLANDA RANGEL PEREIRA', -22.858352, -43.7860809, 'Engenho', 'Rua Francisco Costa Pereira, Engenho', 'https://maps.app.goo.gl/fBx5LZQiVsDj5K229'),
  ('E. M. PROF. MARIANILDE SIQUEIRA GONÇALVES', -22.8760968, -43.7941122, 'Jardim Itaguaí Mar', 'Rua dos Coqueiros, Jardim Itaguaí Mar', 'https://maps.app.goo.gl/whHakaUFkAAUXoTp8'),
  ('E. M. PROF. Mª GUILHERMINA DE S FREIRE', -22.8695694, -43.808565, 'Leandro', 'Estrada do Mazomba, Leandro', 'https://maps.app.goo.gl/RLFzYxGhQZUxL4JE7'),
  ('E. M. PROF. SEVERINA DOS RAMOS DE SOUSA', -22.8994596, -43.8617181, 'Vila Geny', 'Rua Evelin Reis, Vila Geny', 'https://maps.app.goo.gl/QapeVQm6PZdB5peR8'),
  ('E. M. RENATO GONÇALVES MARTINS', -22.8279491, -43.744269, 'Piranema', 'Reta 800, Piranema', 'https://maps.app.goo.gl/UVgiL6yZWK3ha7Vw7'),
  ('E. M. SEVERINO SALUSTIANO DE FARIAS', -22.8387685, -43.7944483, 'Teixeira', 'Estrada do Caçador, Teixeira', 'https://maps.app.goo.gl/61PXHtL3B1s2uJmSA'),
  ('E. M. SYLVIA SOUZA SIQUINELI', -22.8083498, -43.7708415, 'Chaperó', 'Rua Cinco, Chaperó', 'https://maps.app.goo.gl/oLigo6ZGmn2oeDC69'),
  ('E. M. SÃO SEBASTIÃO', -22.811116, -43.809423, 'Raiz da Serra', 'Raiz da Serra', 'https://maps.app.goo.gl/1hvVKgBuz4kXxQR18'),
  ('E. M. TEREZA DE ARAUJO SAGÁRIO', -22.8583942, -43.7583999, null, 'Rua Tabajara', 'https://maps.app.goo.gl/DWk9XKsmSRuBbKp59'),
  ('E. M. VER. AMÉRICO R. AMORIM', -22.903098, -43.874651, 'Itimirim', 'Rua S, Itimirim', 'https://maps.app.goo.gl/oXi6nxQj5Z8vbkX47'),
  ('E. M. VER. JOSÉ GALLIAÇO PRATA', -22.8486472, -43.7862035, 'Amendoeira', 'Rua C, Amendoeira', 'https://maps.app.goo.gl/EzjwPT62M3y6feDg8'),
  ('E. M. VER. PROFESSOR ARTHUR BRITO DE CASTRO', -22.838425, -43.714736, 'Piranema', 'Rua Antonio M Rereira, Piranema', 'https://maps.app.goo.gl/8JiaYt2Cw18kEs2M6'),
  ('E. M. VER. TACIANO FERNANDES NUNES', -22.8730463, -43.800151, 'Brisa Mar', 'Avenida Governador Mário Covas, Brisa Mar', 'https://maps.app.goo.gl/QLxMXdv64HAbZhA2A')
)
update public.ramais_unidades u
set latitude = p.latitude,
    longitude = p.longitude,
    bairro = coalesce(p.bairro, u.bairro),
    endereco = coalesce(p.endereco, u.endereco),
    mapa_url = p.mapa_url,
    updated_at = now()
from planilha p
where u.nome = p.nome;

commit;
