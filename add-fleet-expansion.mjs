import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
const root=path.dirname(fileURLToPath(import.meta.url));
const db=new DatabaseSync(path.join(root,'database','bharatdrive.sqlite'));
const updates=[
 ['Maruti Alto K10','/images/cars/hatchback.png'],['Maruti Swift VXi','/images/cars/hatchback.png'],
 ['Hyundai Creta SX','/images/cars/suv.png'],['Tata Nexon EV','/images/cars/electric-suv.png'],
 ['Mahindra Thar LX','/images/cars/suv.png'],['Toyota Innova Crysta','/images/cars/mpv.png'],
 ['Royal Enfield Classic 350','/images/bikes/classic-bike.png'],['Honda Activa 6G','/images/bikes/scooter.png'],
 ['Force Traveller 12-Seater','/images/cars/passenger-van.png'],['Tata Ace Mini Truck','/images/cars/utility-truck.png'],
 ['Maruti Ertiga VXi','/images/cars/mpv.png'],['BMW 3-Series 320d','/images/cars/luxury-sedan.png'],
 ['Bajaj RE CNG Raptadu','/images/vehicles/auto-rickshaw-v2.svg'],
 ['Piaggio Ape Petrol Peddavadugur','/images/vehicles/auto-rickshaw-v2.svg'],
 ['Electric Passenger Auto JNTU Road','/images/vehicles/electric-auto-rickshaw-v2.svg']
];
const added=[
 ['Kia Seltos GTX','Kia','Seltos GTX','SUV',2899,'Diesel','Automatic',5,'Delhi','/images/cars/suv.png'],
 ['Honda City ZX','Honda','City ZX','Sedan',2199,'Petrol','Automatic',5,'Jaipur','/images/cars/luxury-sedan.png'],
 ['Hyundai i20 N Line','Hyundai','i20 N Line','Hatchback',1599,'Petrol','Manual',5,'Ahmedabad','/images/cars/hatchback.png'],
 ['Toyota Innova Hycross Hybrid','Toyota','Innova Hycross Hybrid','MPV',3499,'Hybrid','Automatic',7,'Kochi','/images/cars/mpv.png'],
 ['Royal Enfield Himalayan 450','Royal Enfield','Himalayan 450','Motorcycle',1999,'Petrol','Manual',2,'Leh','/images/bikes/adventure-bike.png'],
 ['KTM Duke 390','KTM','Duke 390','Motorcycle',1499,'Petrol','Manual',2,'Pune','/images/bikes/street-bike.png'],
 ['TVS Ntorq 125','TVS','Ntorq 125','Scooter',549,'Petrol','Automatic',2,'Mysuru','/images/bikes/scooter.png'],
 ['Yamaha FZ-X','Yamaha','FZ-X','Motorcycle',899,'Petrol','Manual',2,'Manali','/images/bikes/street-bike.png'],
 ['Maruti Baleno Zeta','Maruti','Baleno Zeta','Hatchback',1499,'Petrol','Manual',5,'Anantapur','/images/cars/hatchback.png'],
 ['Tata Punch Pure','Tata','Punch Pure','SUV',1899,'Petrol','Manual',5,'Guntakal','/images/cars/suv.png'],
 ['Honda Amaze VX','Honda','Amaze VX','Sedan',1799,'Petrol','Automatic',5,'Gooty','/images/cars/luxury-sedan.png'],
 ['Hyundai Venue S','Hyundai','Venue S','SUV',2199,'Petrol','Manual',5,'Tadipatri','/images/cars/suv.png'],
 ['Maruti Brezza ZXi','Maruti','Brezza ZXi','SUV',2399,'Petrol','Manual',5,'Kalyandurg','/images/cars/suv.png'],
 ['Tata Tiago EV XT','Tata','Tiago EV XT','Electric Hatchback',2099,'Electric','Automatic',5,'Rayadurg','/images/cars/electric-suv.png'],
 ['Hero Xpulse 200','Hero','Xpulse 200','Motorcycle',1199,'Petrol','Manual',2,'Uravakonda','/images/bikes/adventure-bike.png'],
 ['Maruti Wagon R ZXi','Maruti','Wagon R ZXi','Hatchback',1199,'Petrol','Manual',5,'Pamidi','/images/cars/hatchback.png'],
 ['Hyundai Aura S','Hyundai','Aura S','Sedan',1499,'Petrol','Manual',5,'Yadiki','/images/cars/luxury-sedan.png'],
 ['TVS Jupiter 125','TVS','Jupiter 125','Scooter',499,'Petrol','Automatic',2,'Singanamala','/images/bikes/scooter.png'],
 ['Honda City VX Anantapur','Honda','City VX','Sedan',1999,'Petrol','Automatic',5,'Anantapur - Aravinda Nagar','/images/cars/luxury-sedan.png'],
 ['Hyundai Grand i10 Nios Sai Nagar','Hyundai','Grand i10 Nios','Hatchback',1299,'Petrol','Manual',5,'Anantapur - Sai Nagar','/images/cars/hatchback.png'],
 ['Suzuki Access 125 Ashok Nagar','Suzuki','Access 125','Scooter',399,'Petrol','Automatic',2,'Anantapur - Ashok Nagar','/images/bikes/scooter.png'],
 ['Tata Nexon XM Srinagar','Tata','Nexon XM','SUV',2299,'Petrol','Manual',5,'Anantapur - Srinagar Colony','/images/cars/suv.png'],
 ['Renault Kiger Ramnagar','Renault','Kiger','SUV',2099,'Petrol','Manual',5,'Anantapur - Ramnagar','/images/cars/suv.png'],
 ['Royal Enfield Hunter Vijayanagar','Royal Enfield','Hunter 350','Motorcycle',1299,'Petrol','Manual',2,'Anantapur - Vijayanagar Colony','/images/bikes/street-bike.png'],
 ["Maruti Baleno CNG Old Town","Maruti","Baleno CNG","Hatchback",1499,"CNG","Manual",5,"Anantapur - Old Town","/images/cars/hatchback.png"],
 ["Maruti Dzire S CNG Housing Board","Maruti","Dzire Tour S CNG","Sedan",1699,"CNG","Manual",5,"Anantapur - Housing Board Colony","/images/cars/luxury-sedan.png"],
 ["Tata Tiago iCNG Sangamesh Nagar","Tata","Tiago iCNG","Hatchback",1399,"CNG","Manual",5,"Anantapur - Sangamesh Nagar","/images/cars/hatchback.png"],
 ["Maruti Wagon R CNG Bangalore Road","Maruti","Wagon R CNG","Hatchback",1299,"CNG","Manual",5,"Anantapur - Bangalore Road","/images/cars/hatchback.png"],
 ["Hyundai Aura CNG Surya Nagar","Hyundai","Aura CNG","Sedan",1599,"CNG","Manual",5,"Anantapur - Surya Nagar","/images/cars/luxury-sedan.png"],
 ["Hyundai Exter CNG Guntakal","Hyundai","Exter CNG","SUV",1799,"CNG","Manual",5,"Guntakal","/images/cars/suv.png"],
 ["Tata Tigor EV Tadipatri","Tata","Tigor EV","Electric Sedan",1899,"Electric","Automatic",5,"Tadipatri","/images/cars/electric-suv.png"],
 ["Tata Punch EV Aravinda Nagar","Tata","Punch EV","Electric SUV",2299,"Electric","Automatic",5,"Anantapur - Aravinda Nagar","/images/cars/electric-suv.png"],
 ["Ather Rizta Sai Nagar","Ather","Rizta","Electric Scooter",799,"Electric","Automatic",2,"Anantapur - Sai Nagar","/images/bikes/scooter.png"],
 ["Ola S1 Pro Ashok Nagar","Ola","S1 Pro","Electric Scooter",699,"Electric","Automatic",2,"Anantapur - Ashok Nagar","/images/bikes/scooter.png"],
 ["TVS iQube Gooty","TVS","iQube","Electric Scooter",649,"Electric","Automatic",2,"Gooty","/images/bikes/scooter.png"],
 ["Bajaj Chetak Guntakal","Bajaj","Chetak","Electric Scooter",699,"Electric","Automatic",2,"Guntakal","/images/bikes/scooter.png"],
 ["Royal Enfield Meteor 350 Kalyandurg","Royal Enfield","Meteor 350","Motorcycle",1499,"Petrol","Manual",2,"Kalyandurg","/images/bikes/classic-bike.png"],
 ["Hero Splendor Plus Rayadurg","Hero","Splendor Plus","Motorcycle",499,"Petrol","Manual",2,"Rayadurg","/images/bikes/street-bike.png"],
 ["Honda SP 125 Uravakonda","Honda","SP 125","Motorcycle",599,"Petrol","Manual",2,"Uravakonda","/images/bikes/street-bike.png"],
 ["Yamaha FZ-S FI Pamidi","Yamaha","FZ-S FI","Motorcycle",749,"Petrol","Manual",2,"Pamidi","/images/bikes/street-bike.png"],
 ["Bajaj Pulsar N160 Yadiki","Bajaj","Pulsar N160","Motorcycle",799,"Petrol","Manual",2,"Yadiki","/images/bikes/street-bike.png"],
 ["TVS Apache RTR 160 Singanamala","TVS","Apache RTR 160 4V","Motorcycle",749,"Petrol","Manual",2,"Singanamala","/images/bikes/street-bike.png"],
 ["Yamaha Fascino 125 Atmakur","Yamaha","Fascino 125","Scooter",499,"Petrol","Automatic",2,"Atmakur","/images/bikes/scooter.png"],
 ["Honda Dio 125 Narpala","Honda","Dio 125","Scooter",449,"Petrol","Automatic",2,"Narpala","/images/bikes/scooter.png"],
 ["Suzuki Access 125 Garladinne","Suzuki","Access 125","Scooter",499,"Petrol","Automatic",2,"Garladinne","/images/bikes/scooter.png"],
 ["Bajaj RE CNG Raptadu","Bajaj","RE Compact CNG","Auto Rickshaw",899,"CNG","Automatic",3,"Raptadu","/images/vehicles/auto-rickshaw-v2.svg"],
 ["Piaggio Ape Petrol Peddavadugur","Piaggio","Ape Auto","Auto Rickshaw",799,"Petrol","Manual",3,"Peddavadugur","/images/vehicles/auto-rickshaw-v2.svg"],
 ["Mahindra Jeeto Peddapappur","Mahindra","Jeeto Plus","Commercial",1399,"Diesel","Manual",2,"Peddapappur","/images/cars/utility-truck.png"],
 ["Tata Yodha Pickup Beluguppa","Tata","Yodha 2.0","Pickup Truck",2199,"Diesel","Manual",2,"Beluguppa","/images/cars/utility-truck.png"],
 ["Force Urbania Van Yellanur","Force","Urbania 12-Seater","Van",4999,"Diesel","Manual",12,"Yellanur","/images/cars/passenger-van.png"],
 ["Maruti Eeco CNG Kambadur","Maruti","Eeco CNG","Van",1699,"CNG","Manual",7,"Kambadur","/images/cars/passenger-van.png"],
 ["Toyota Innova Hycross Dharmavaram","Toyota","Innova Hycross Hybrid","MPV",3499,"Hybrid","Automatic",7,"Dharmavaram","/images/cars/mpv.png"],
 ["Mahindra Bolero Neo Hindupur","Mahindra","Bolero Neo","SUV",2399,"Diesel","Manual",7,"Hindupur","/images/cars/suv.png"],
 ["Honda Amaze CVT Kadiri","Honda","Amaze CVT","Sedan",1799,"Petrol","Automatic",5,"Kadiri","/images/cars/luxury-sedan.png"],
 ["Maruti Fronx AGS Penukonda","Maruti","Fronx AGS","SUV",1999,"Petrol","Automatic",5,"Penukonda","/images/cars/suv.png"],
 ["Tata Tiago Petrol Puttaparthi","Tata","Tiago XT","Hatchback",1299,"Petrol","Manual",5,"Puttaparthi","/images/cars/hatchback.png"],
 ["Maruti Swift CNG Ramnagar","Maruti","Swift VXi CNG","Hatchback",1499,"CNG","Manual",5,"Anantapur - Ramnagar","/images/cars/hatchback.png"],
 ["Suzuki Access Vijayanagar Colony","Suzuki","Access 125","Scooter",499,"Petrol","Automatic",2,"Anantapur - Vijayanagar Colony","/images/bikes/scooter.png"],
 ["KTM Duke 200 SBI Colony","KTM","Duke 200","Motorcycle",999,"Petrol","Manual",2,"Anantapur - SBI Colony","/images/bikes/street-bike.png"],
 ["Hero Xpulse 200 Maruthi Nagar","Hero","Xpulse 200 4V","Motorcycle",1199,"Petrol","Manual",2,"Anantapur - Maruthi Nagar","/images/bikes/adventure-bike.png"],
 ["Electric Passenger Auto JNTU Road","Mahindra","Treo Yaari","Electric Auto",999,"Electric","Automatic",3,"Anantapur - JNTU College Road","/images/vehicles/electric-auto-rickshaw-v2.svg"],
 ["Hyundai i20 Diesel RDT Area","Hyundai","i20 Sportz Diesel","Hatchback",1599,"Diesel","Manual",5,"Anantapur - R.D.T. Area","/images/cars/hatchback.png"],
 ["Kia Carens Diesel Garladinne","Kia","Carens Prestige","MPV",2799,"Diesel","Automatic",7,"Garladinne","/images/cars/mpv.png"]
];
const notice='Illustrative college-project listing with a locally stored sample vehicle image and example daily rate. Confirm the real vehicle, rate and availability before accepting any booking.';
db.exec('BEGIN IMMEDIATE');
try{
 const update=db.prepare('UPDATE vehicles SET image=? WHERE name=?');
 for(const [name,image] of updates) update.run(image,name);
 const exists=db.prepare('SELECT id FROM vehicles WHERE name=?');
 const insert=db.prepare("INSERT INTO vehicles(name,brand,model,category,price_per_day,fuel_type,transmission,seats,image,description,location,status) VALUES(?,?,?,?,?,?,?,?,?,?,?,'active')");
 let inserted=0;
 for(const [name,brand,model,category,price,fuel,transmission,seats,location,image] of added){
   if(exists.get(name)) continue;
   insert.run(name,brand,model,category,price,fuel,transmission,seats,image,notice,location); inserted++;
 }
 db.exec('COMMIT'); console.log(JSON.stringify({inserted,updated:updates.length,addedTotal:added.length}));
}catch(error){db.exec('ROLLBACK');throw error;}finally{db.close();}