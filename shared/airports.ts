import type { Airport } from './types'

export const airports: Airport[] = [
  ['SIN','Singapore Changi Airport','Singapore','SG','Singapore',1.36,103.99],
  ['KUL','Kuala Lumpur International Airport','Kuala Lumpur','MY','Malaysia',2.75,101.71],
  ['BKK','Suvarnabhumi Airport','Bangkok','TH','Thailand',13.69,100.75],
  ['HKT','Phuket International Airport','Phuket','TH','Thailand',8.11,98.31],
  ['DPS','Ngurah Rai International Airport','Denpasar','ID','Indonesia',-8.75,115.17],
  ['CGK','Soekarno–Hatta International Airport','Jakarta','ID','Indonesia',-6.13,106.66],
  ['SGN','Tan Son Nhat International Airport','Ho Chi Minh City','VN','Vietnam',10.82,106.65],
  ['HAN','Noi Bai International Airport','Hanoi','VN','Vietnam',21.22,105.81],
  ['MNL','Ninoy Aquino International Airport','Manila','PH','Philippines',14.51,121.02],
  ['HKG','Hong Kong International Airport','Hong Kong','HK','Hong Kong',22.31,113.91],
  ['TPE','Taiwan Taoyuan International Airport','Taipei','TW','Taiwan',25.08,121.23],
  ['NRT','Narita International Airport','Tokyo','JP','Japan',35.77,140.39],
  ['HND','Haneda Airport','Tokyo','JP','Japan',35.55,139.78],
  ['ICN','Incheon International Airport','Seoul','KR','South Korea',37.46,126.44],
  ['DEL','Indira Gandhi International Airport','Delhi','IN','India',28.56,77.10],
  ['BOM','Chhatrapati Shivaji Maharaj International Airport','Mumbai','IN','India',19.09,72.87],
  ['CMB','Bandaranaike International Airport','Colombo','LK','Sri Lanka',7.18,79.88],
  ['DXB','Dubai International Airport','Dubai','AE','United Arab Emirates',25.25,55.36],
  ['DOH','Hamad International Airport','Doha','QA','Qatar',25.27,51.61],
  ['IST','Istanbul Airport','Istanbul','TR','Türkiye',41.28,28.75],
  ['LHR','Heathrow Airport','London','GB','United Kingdom',51.47,-0.45],
  ['CDG','Charles de Gaulle Airport','Paris','FR','France',49.01,2.55],
  ['AMS','Amsterdam Airport Schiphol','Amsterdam','NL','Netherlands',52.31,4.76],
  ['FRA','Frankfurt Airport','Frankfurt','DE','Germany',50.04,8.56],
  ['FCO','Leonardo da Vinci–Fiumicino Airport','Rome','IT','Italy',41.80,12.24],
  ['MAD','Adolfo Suárez Madrid–Barajas Airport','Madrid','ES','Spain',40.47,-3.56],
  ['LIS','Humberto Delgado Airport','Lisbon','PT','Portugal',38.77,-9.13],
  ['ATH','Athens International Airport','Athens','GR','Greece',37.94,23.94],
  ['ZRH','Zurich Airport','Zurich','CH','Switzerland',47.46,8.55],
  ['JFK','John F. Kennedy International Airport','New York','US','United States',40.64,-73.78],
  ['LAX','Los Angeles International Airport','Los Angeles','US','United States',33.94,-118.41],
  ['YVR','Vancouver International Airport','Vancouver','CA','Canada',49.19,-123.18],
  ['YYZ','Toronto Pearson International Airport','Toronto','CA','Canada',43.68,-79.63],
  ['MEX','Mexico City International Airport','Mexico City','MX','Mexico',19.44,-99.07],
  ['GRU','São Paulo/Guarulhos International Airport','São Paulo','BR','Brazil',-23.44,-46.47],
  ['EZE','Ministro Pistarini International Airport','Buenos Aires','AR','Argentina',-34.82,-58.54],
  ['SCL','Arturo Merino Benítez International Airport','Santiago','CL','Chile',-33.39,-70.79],
  ['SYD','Sydney Kingsford Smith Airport','Sydney','AU','Australia',-33.94,151.18],
  ['MEL','Melbourne Airport','Melbourne','AU','Australia',-37.67,144.84],
  ['AKL','Auckland Airport','Auckland','NZ','New Zealand',-37.01,174.79],
  ['JNB','O. R. Tambo International Airport','Johannesburg','ZA','South Africa',-26.14,28.25],
  ['CPT','Cape Town International Airport','Cape Town','ZA','South Africa',-33.97,18.60],
  ['CAI','Cairo International Airport','Cairo','EG','Egypt',30.12,31.41],
  ['CMN','Mohammed V International Airport','Casablanca','MA','Morocco',33.37,-7.59],
  ['NBO','Jomo Kenyatta International Airport','Nairobi','KE','Kenya',-1.32,36.93]
].map(([iata,name,municipality,countryCode,country,lat,lon]) => ({ iata, name, municipality, countryCode, country, lat, lon } as Airport))

export const airportsByCountry = airports.reduce<Record<string, Airport[]>>((grouped, airport) => {
  ;(grouped[airport.countryCode] ??= []).push(airport)
  return grouped
}, {})
