import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const root=path.dirname(fileURLToPath(import.meta.url));
const db=new DatabaseSync(path.join(root,'database','bharatdrive.sqlite'));
const existing=db.prepare('SELECT COUNT(*) count FROM vehicles').get().count;
if(existing){console.log(`Seed skipped: the database already has ${existing} vehicle(s).`);db.close();process.exit(0);}
const fleet=[
 ['Maruti Alto K10','Maruti','Alto K10','Hatchback',899,'Petrol','Manual',5,'Bengaluru'],
 ['Maruti Swift VXi','Maruti','Swift VXi','Hatchback',1299,'Petrol','Manual',5,'Bengaluru'],
 ['Hyundai Creta SX','Hyundai','Creta SX','SUV',2499,'Diesel','Automatic',5,'Mumbai'],
 ['Tata Nexon EV','Tata','Nexon EV','Electric SUV',1899,'Electric','Automatic',5,'Bengaluru'],
 ['Mahindra Thar LX','Mahindra','Thar LX','SUV',3499,'Diesel','Manual',4,'Goa'],
 ['Toyota Innova Crysta','Toyota','Innova Crysta','MPV',3199,'Diesel','Automatic',7,'Hyderabad'],
 ['Royal Enfield Classic 350','Royal Enfield','Classic 350','Motorcycle',899,'Petrol','Manual',2,'Goa'],
 ['Honda Activa 6G','Honda','Activa 6G','Scooter',349,'Petrol','Automatic',2,'Chennai'],
 ['Force Traveller 12-Seater','Force','Traveller 12-Seater','Van',4499,'Diesel','Manual',12,'Mumbai'],
 ['Tata Ace Mini Truck','Tata','Ace Mini Truck','Commercial',1599,'Diesel','Manual',2,'Delhi NCR'],
 ['Maruti Ertiga VXi','Maruti','Ertiga VXi','MPV',2199,'Petrol','Manual',7,'Pune'],
 ['BMW 3-Series 320d','BMW','3-Series 320d','Luxury Sedan',6999,'Diesel','Automatic',5,'Mumbai']
];
const insert=db.prepare("INSERT INTO vehicles(name,brand,model,category,price_per_day,fuel_type,transmission,seats,description,location,status) VALUES(?,?,?,?,?,?,?,?,?,?,'active')");
db.exec('BEGIN IMMEDIATE');
try{
  if(db.prepare('SELECT COUNT(*) count FROM vehicles').get().count){db.exec('ROLLBACK');console.log('Seed skipped: vehicles were added while the seed was starting.');db.close();process.exit(0);}
  for(const [name,brand,model,category,price,fuel,transmission,seats,location] of fleet)insert.run(name,brand,model,category,price,fuel,transmission,seats,'Starter listing based on the supplied V1 fleet. Confirm the exact vehicle, rate and availability before accepting real bookings.',location);
  db.exec('COMMIT');console.log(`Added ${fleet.length} starter vehicles across ${new Set(fleet.map(x=>x[8])).size} pickup cities.`);
}catch(error){if(db.isTransaction)db.exec('ROLLBACK');throw error;}finally{db.close();}
