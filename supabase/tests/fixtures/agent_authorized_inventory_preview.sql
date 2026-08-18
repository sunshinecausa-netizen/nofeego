-- PREVIEW ONLY / DO NOT RUN AGAINST PRODUCTION AS A WRITE TARGET.
-- Synthetic internal inventory layered over three public-catalog building IDs.
BEGIN;

INSERT INTO public.buildings(id,building_id,slug,name,address,street_address,city,state,zip_code,borough,neighborhood,latitude,longitude,is_active,official_building_website,management_company)
VALUES
('17c223bf-52c9-46c7-add7-d1df1538dc6e','preview-auth-1','1-christopher-street-new-york','1 Christopher Street','1 Christopher Street','1 Christopher Street','New York','NY','10014','Manhattan','West Village',40.734119,-73.999743,true,'https://example.invalid/christopher','Preview West Management'),
('054fbbff-550b-43de-9d09-99025211419c','preview-auth-2','1-flatbush','1 Flatbush','558 Fulton Street','558 Fulton Street','Brooklyn','NY','11217','Brooklyn','Downtown Brooklyn',40.688457,-73.979961,true,'https://example.invalid/flatbush','Preview Brooklyn Management'),
('fb3f024c-0f43-46ba-aa2d-ffab6a6a138c','preview-auth-3','1-qps','1 QPS','42-20 24th Street','42-20 24th Street','Long Island City','NY','11101','Queens','Hunters Point',40.750482,-73.941940,true,'https://example.invalid/qps','Preview Queens Management')
ON CONFLICT(id) DO UPDATE SET latitude=EXCLUDED.latitude,longitude=EXCLUDED.longitude,address=EXCLUDED.address,street_address=EXCLUDED.street_address;

INSERT INTO public.building_sources(id,source_entry_id,building_id,source_type,source_name,source_url,last_verified_at,verification_status,is_active)
VALUES
('71000000-0000-4000-8000-000000000001','preview-agent-source-1','17c223bf-52c9-46c7-add7-d1df1538dc6e','property_portal','Synthetic leasing portal','https://example.invalid/christopher/availability',now(),'verified',true),
('71000000-0000-4000-8000-000000000002','preview-agent-source-2','054fbbff-550b-43de-9d09-99025211419c','property_portal','Synthetic leasing portal','https://example.invalid/flatbush/availability',now()-interval '3 days','verified',true),
('71000000-0000-4000-8000-000000000003','preview-agent-source-3','fb3f024c-0f43-46ba-aa2d-ffab6a6a138c','property_portal','Synthetic leasing portal','https://example.invalid/qps/availability',now()-interval '10 days','stale',true)
ON CONFLICT(id) DO NOTHING;

INSERT INTO public.units(id,unit_id,building_id,source_id,unit_number,floorplan_name,unit_type,bedrooms,bathrooms,square_feet,lease_term,broker_fee,is_no_fee,status,is_active)
VALUES
('72000000-0000-4000-8000-000000000001','preview-unit-1','17c223bf-52c9-46c7-add7-d1df1538dc6e','71000000-0000-4000-8000-000000000001','5A','S1','Studio',0,1,505,12,0,true,'active',true),
('72000000-0000-4000-8000-000000000002','preview-unit-2','17c223bf-52c9-46c7-add7-d1df1538dc6e','71000000-0000-4000-8000-000000000001','8B','A2','1 Bedroom',1,1,710,14,0,true,'active',true),
('72000000-0000-4000-8000-000000000003','preview-unit-3','054fbbff-550b-43de-9d09-99025211419c','71000000-0000-4000-8000-000000000002','12C','B1','2 Bedroom',2,2,1040,12,7500,false,'active',true),
('72000000-0000-4000-8000-000000000004','preview-unit-4','fb3f024c-0f43-46ba-aa2d-ffab6a6a138c','71000000-0000-4000-8000-000000000003','PH2','C1','3 Bedroom',3,2,1450,12,0,true,'active',true)
ON CONFLICT(id) DO NOTHING;

INSERT INTO public.inventory_snapshots(id,building_id,unit_id,source_id,source_record_id,rent,net_effective_rent,concession_text,concession_amount,available_date,is_no_fee,inventory_status,captured_at,valid_from,valid_until)
VALUES
('73000000-0000-4000-8000-000000000001','17c223bf-52c9-46c7-add7-d1df1538dc6e','72000000-0000-4000-8000-000000000001','71000000-0000-4000-8000-000000000001','preview-current-1',4250,3985,'One month free on a 12-month lease',4250,current_date,true,'available',now(),now(),now()+interval '2 days'),
('73000000-0000-4000-8000-000000000002','17c223bf-52c9-46c7-add7-d1df1538dc6e','72000000-0000-4000-8000-000000000002','71000000-0000-4000-8000-000000000001','preview-current-2',5125,4760,NULL,NULL,current_date+7,true,'available',now(),now(),now()+interval '2 days'),
('73000000-0000-4000-8000-000000000003','054fbbff-550b-43de-9d09-99025211419c','72000000-0000-4000-8000-000000000003','71000000-0000-4000-8000-000000000002','preview-aging-1',6800,6460,'Two weeks free',3400,current_date+14,false,'available',now()-interval '3 days',now()-interval '3 days',now()+interval '4 days'),
('73000000-0000-4000-8000-000000000004','fb3f024c-0f43-46ba-aa2d-ffab6a6a138c','72000000-0000-4000-8000-000000000004','71000000-0000-4000-8000-000000000003','preview-stale-1',8950,8500,'One month free',8950,current_date+21,true,'available',now()-interval '10 days',now()-interval '10 days',now()-interval '2 days')
ON CONFLICT(id) DO NOTHING;

INSERT INTO public.property_organizations(id,name,website,leasing_office_website,office_hours)
VALUES('74000000-0000-4000-8000-000000000001','Fictional Preview Leasing','https://example.invalid/property','https://example.invalid/leasing','Mon–Fri 9:00 AM–6:00 PM')
ON CONFLICT(id) DO UPDATE SET website=EXCLUDED.website,leasing_office_website=EXCLUDED.leasing_office_website,office_hours=EXCLUDED.office_hours;

INSERT INTO public.property_building_access(organization_id,building_id,granted_by)
SELECT '74000000-0000-4000-8000-000000000001',b.id,p.id FROM public.buildings b CROSS JOIN LATERAL (
  SELECT id FROM public.profiles WHERE account_role='admin' AND authorization_status='active' ORDER BY created_at DESC LIMIT 1
) p WHERE b.id IN ('17c223bf-52c9-46c7-add7-d1df1538dc6e','054fbbff-550b-43de-9d09-99025211419c','fb3f024c-0f43-46ba-aa2d-ffab6a6a138c')
ON CONFLICT DO NOTHING;

INSERT INTO public.agent_building_inventory_access(agent_id,building_id,granted_by,status)
SELECT a.id,b.id,g.id,'active' FROM public.profiles a CROSS JOIN public.buildings b CROSS JOIN LATERAL (
  SELECT id FROM public.profiles WHERE account_role='admin' AND authorization_status='active' ORDER BY created_at DESC LIMIT 1
) g WHERE a.email='p0-agent-20260818161752@example.invalid' AND b.id IN ('17c223bf-52c9-46c7-add7-d1df1538dc6e','054fbbff-550b-43de-9d09-99025211419c','fb3f024c-0f43-46ba-aa2d-ffab6a6a138c')
ON CONFLICT(agent_id,building_id) DO UPDATE SET status='active',expires_at=NULL,updated_at=now();

INSERT INTO public.property_contacts(id,building_id,organization_id,name,role_title,purpose,email,phone,website,preferred_method,preferred_hours,visibility,last_verified_at,verification_expires_at,is_active,needs_review)
VALUES('75000000-0000-4000-8000-000000000001','17c223bf-52c9-46c7-add7-d1df1538dc6e','74000000-0000-4000-8000-000000000001','Fictional Preview Leasing Team','Leasing office','leasing','leasing-preview@example.invalid','+1 212 555 0199','https://example.invalid/leasing','email','Mon–Fri 9:00 AM–6:00 PM','agent_only',now(),now()+interval '30 days',true,false)
ON CONFLICT(id) DO NOTHING;

INSERT INTO public.application_policies(building_id,application_url,last_verified_at,verification_expires_at)
VALUES('17c223bf-52c9-46c7-add7-d1df1538dc6e','https://example.invalid/application',now(),now()+interval '30 days')
ON CONFLICT(building_id) DO UPDATE SET application_url=EXCLUDED.application_url,last_verified_at=EXCLUDED.last_verified_at,verification_expires_at=EXCLUDED.verification_expires_at;

INSERT INTO public.unit_fees(id,unit_id,fee_type,amount,currency,description,is_mandatory,last_verified_at,valid_until)
VALUES('76000000-0000-4000-8000-000000000001','72000000-0000-4000-8000-000000000001','Security deposit',1000,'USD','Refundable security deposit',true,now(),now()+interval '30 days')
ON CONFLICT(id) DO NOTHING;

COMMIT;
