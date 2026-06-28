INSERT INTO organizations (id, name, slug, compliance_profile) VALUES
  ('00000000-0000-4000-8000-000000000001', 'Pharma Demo Co.', 'demo',
   '{"sop_map":"PV-SOP-2026-01","validation_state":"pilot"}')
ON CONFLICT (id) DO NOTHING;

INSERT INTO ss_users (id, organization_id, email, password_hash, full_name, role) VALUES
  ('00000000-0000-4000-8001-000000000001','00000000-0000-4000-8000-000000000001',
   'admin@vigil.demo','$2b$10$lF8ARYGtoh336iCTgKhkm.V6l/yn4GaoiCZS39SeUs1vn7K3XbBJy','Admin User','pharma_admin'),
  ('00000000-0000-4000-8001-000000000002','00000000-0000-4000-8000-000000000001',
   'reviewer@vigil.demo','$2b$10$lF8ARYGtoh336iCTgKhkm.V6l/yn4GaoiCZS39SeUs1vn7K3XbBJy','Dr. R. Moreno','pv_reviewer'),
  ('00000000-0000-4000-8001-000000000003','00000000-0000-4000-8000-000000000001',
   'signal@vigil.demo','$2b$10$lF8ARYGtoh336iCTgKhkm.V6l/yn4GaoiCZS39SeUs1vn7K3XbBJy','K. Schmidt','signal_scientist'),
  ('00000000-0000-4000-8001-000000000004','00000000-0000-4000-8000-000000000001',
   'medical@vigil.demo','$2b$10$lF8ARYGtoh336iCTgKhkm.V6l/yn4GaoiCZS39SeUs1vn7K3XbBJy','Prof. L. Andrade','medical_reviewer'),
  ('00000000-0000-4000-8001-000000000005','00000000-0000-4000-8000-000000000001',
   'operator@vigil.demo','$2b$10$lF8ARYGtoh336iCTgKhkm.V6l/yn4GaoiCZS39SeUs1vn7K3XbBJy','M. Garcia','psp_operator')
ON CONFLICT (id) DO NOTHING;

INSERT INTO products
  (id, organization_id, brand_name, generic_name, dose_forms, routes,
   strengths, indication, known_risks, medication_schedule, special_warnings, playbook_type)
VALUES
  ('00000000-0000-4000-8002-000000000001','00000000-0000-4000-8000-000000000001',
   'CardioPress','Lisinopril',ARRAY['tablet'],ARRAY['oral'],
   ARRAY['5mg','10mg','20mg'],'Hypertension, Heart failure',
   ARRAY['Angioedema','Dry cough','Hypotension','Hyperkalaemia','Renal impairment'],
   'Once daily in the morning',
   'Escalate facial swelling, breathing trouble, fainting, or hospitalization mentions.',
   'cardiovascular')
ON CONFLICT (id) DO NOTHING;

INSERT INTO pv_projects
  (id, organization_id, product_id, name, description, project_type, status,
   countries, languages, channels_enabled, patient_population,
   detect_adverse_events, detect_medication_errors, detect_therapeutic_failure,
   detect_fall_risk, sla_hours, owner_id)
VALUES
  ('00000000-0000-4000-8003-000000000001',
   '00000000-0000-4000-8000-000000000001',
   '00000000-0000-4000-8002-000000000001',
   'CardioPress Post-Market Safety Watch',
   'Older adult patient-generated safety monitoring across app, phone, WhatsApp, and caregiver channels.',
   'post_market_surveillance','active',
   ARRAY['ES','DE'],ARRAY['es','de','en'],
   ARRAY['phone','app','whatsapp','caregiver_app'],
   'Adults 65+ enrolled in sponsor-controlled post-market surveillance.',
   TRUE,TRUE,TRUE,TRUE,72,
   '00000000-0000-4000-8001-000000000001')
ON CONFLICT (id) DO NOTHING;

INSERT INTO follow_up_templates
  (id, organization_id, project_id, question_text, language, trigger_category, field_target, display_order, is_mandatory)
VALUES
  ('00000000-0000-4000-8014-000000000001','00000000-0000-4000-8000-000000000001',
   '00000000-0000-4000-8003-000000000001',
   'When did the symptom first start?','en','adverse_event','onset_date',1,TRUE),
  ('00000000-0000-4000-8014-000000000002','00000000-0000-4000-8000-000000000001',
   '00000000-0000-4000-8003-000000000001',
   'Did you visit a doctor, emergency room, or hospital?','en','adverse_event','seriousness_criteria',2,TRUE),
  ('00000000-0000-4000-8014-000000000003','00000000-0000-4000-8000-000000000001',
   '00000000-0000-4000-8003-000000000001',
   'Were any doses missed, doubled, or taken at a different time?','en','medication_error','dose',3,FALSE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO patients
  (id, organization_id, project_id, product_id, patient_ref,
   age_group, sex, country, language, condition,
   medication_schedule, preferred_channel, caregiver_name, caregiver_consent, consent_status, consent_date)
VALUES
  ('00000000-0000-4000-8004-000000000001',
   '00000000-0000-4000-8000-000000000001',
   '00000000-0000-4000-8003-000000000001',
   '00000000-0000-4000-8002-000000000001',
   'P-7234','71-75','F','ES','es','Hypertension',
   'Lisinopril 10mg once daily morning','app','Elena R.',TRUE,'consented','2026-06-01'),
  ('00000000-0000-4000-8004-000000000002',
   '00000000-0000-4000-8000-000000000001',
   '00000000-0000-4000-8003-000000000001',
   '00000000-0000-4000-8002-000000000001',
   'P-3421','76-80','M','ES','es','Hypertension, Heart failure',
   'Lisinopril 20mg once daily morning','phone',NULL,FALSE,'consented','2026-06-03'),
  ('00000000-0000-4000-8004-000000000003',
   '00000000-0000-4000-8000-000000000001',
   '00000000-0000-4000-8003-000000000001',
   '00000000-0000-4000-8002-000000000001',
   'P-8891','71-75','M','DE','de','Hypertension',
   'Lisinopril 5mg once daily morning','whatsapp',NULL,FALSE,'consented','2026-06-04'),
  ('00000000-0000-4000-8004-000000000004',
   '00000000-0000-4000-8000-000000000001',
   '00000000-0000-4000-8003-000000000001',
   '00000000-0000-4000-8002-000000000001',
   'P-1145','65-70','F','DE','de','Hypertension, Diabetes type 2',
   'Lisinopril 10mg once daily morning','app','Jonas K.',TRUE,'consented','2026-06-05')
ON CONFLICT (id) DO NOTHING;

INSERT INTO reporters (id, organization_id, patient_id, reporter_type, relationship, country, is_primary) VALUES
  ('00000000-0000-4000-8005-000000000001','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8004-000000000001','patient',NULL,'ES',TRUE),
  ('00000000-0000-4000-8005-000000000002','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8004-000000000001','caregiver','child','ES',FALSE),
  ('00000000-0000-4000-8005-000000000003','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8004-000000000002','patient',NULL,'ES',TRUE),
  ('00000000-0000-4000-8005-000000000004','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8004-000000000003','patient',NULL,'DE',TRUE),
  ('00000000-0000-4000-8005-000000000005','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8004-000000000004','patient',NULL,'DE',TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO interactions
  (id, organization_id, project_id, patient_id, reporter_id,
   channel, transcript_text, language,
   ai_processed, safety_mention_detected, observations_count, interaction_at)
VALUES
  ('00000000-0000-4000-8006-000000000001',
   '00000000-0000-4000-8000-000000000001',
   '00000000-0000-4000-8003-000000000001',
   '00000000-0000-4000-8004-000000000001',
   '00000000-0000-4000-8005-000000000001',
   'app','My face keeps swelling up and it is hard to swallow since I started the new blood pressure pill.',
   'en',TRUE,TRUE,2,NOW() - INTERVAL '2 hours'),
  ('00000000-0000-4000-8006-000000000002',
   '00000000-0000-4000-8000-000000000001',
   '00000000-0000-4000-8003-000000000001',
   '00000000-0000-4000-8004-000000000001',
   '00000000-0000-4000-8005-000000000002',
   'caregiver_app','She was confused this week and almost fell in the bathroom. I am worried about this medication.',
   'en',TRUE,TRUE,2,NOW() - INTERVAL '1 hour 30 minutes'),
  ('00000000-0000-4000-8006-000000000003',
   '00000000-0000-4000-8000-000000000001',
   '00000000-0000-4000-8003-000000000001',
   '00000000-0000-4000-8004-000000000002',
   '00000000-0000-4000-8005-000000000003',
   'phone','I have extreme tiredness and trouble breathing, my legs feel very heavy.',
   'es',TRUE,TRUE,1,NOW() - INTERVAL '6 hours'),
  ('00000000-0000-4000-8006-000000000004',
   '00000000-0000-4000-8000-000000000001',
   '00000000-0000-4000-8003-000000000001',
   '00000000-0000-4000-8004-000000000003',
   '00000000-0000-4000-8005-000000000004',
   'whatsapp','My legs and arms ache all the time. Also I skipped two doses this week because I forgot.',
   'de',TRUE,TRUE,2,NOW() - INTERVAL '4 hours'),
  ('00000000-0000-4000-8006-000000000005',
   '00000000-0000-4000-8000-000000000001',
   '00000000-0000-4000-8003-000000000001',
   '00000000-0000-4000-8004-000000000004',
   '00000000-0000-4000-8005-000000000005',
   'app','I have a terrible dry cough that will not go away since starting this medicine.',
   'de',TRUE,TRUE,1,NOW() - INTERVAL '12 hours')
ON CONFLICT (id) DO NOTHING;

INSERT INTO safety_observations
  (id, organization_id, interaction_id, patient_id, product_id,
   observation_type, verbatim_extract, normalized_term,
   suggested_meddra_pt, suggested_meddra_code,
   ai_confidence, severity_indicator, is_serious, seriousness_criteria)
VALUES
  ('00000000-0000-4000-8007-000000000001','00000000-0000-4000-8000-000000000001',
   '00000000-0000-4000-8006-000000000001','00000000-0000-4000-8004-000000000001',
   '00000000-0000-4000-8002-000000000001',
   'adverse_event','face keeps swelling up and it is hard to swallow',
   'facial swelling with dysphagia','Angioedema','10002424',
   94,'serious',TRUE,ARRAY['life_threatening','medically_important']),
  ('00000000-0000-4000-8007-000000000002','00000000-0000-4000-8000-000000000001',
   '00000000-0000-4000-8006-000000000002','00000000-0000-4000-8004-000000000001',
   '00000000-0000-4000-8002-000000000001',
   'fall_risk','confused this week and almost fell in the bathroom',
   'confusion with near fall','Fall','10016173',
   88,'serious',TRUE,ARRAY['medically_important']),
  ('00000000-0000-4000-8007-000000000003','00000000-0000-4000-8000-000000000001',
   '00000000-0000-4000-8006-000000000003','00000000-0000-4000-8004-000000000002',
   '00000000-0000-4000-8002-000000000001',
   'adverse_event','extreme tiredness and trouble breathing, legs very heavy',
   'fatigue with dyspnoea and oedema','Dyspnoea','10013968',
   86,'serious',TRUE,ARRAY['medically_important']),
  ('00000000-0000-4000-8007-000000000004','00000000-0000-4000-8000-000000000001',
   '00000000-0000-4000-8006-000000000004','00000000-0000-4000-8004-000000000003',
   '00000000-0000-4000-8002-000000000001',
   'adverse_event','legs and arms ache all the time',
   'myalgia','Myalgia','10028411',
   87,'moderate',FALSE,ARRAY[]::TEXT[]),
  ('00000000-0000-4000-8007-000000000005','00000000-0000-4000-8000-000000000001',
   '00000000-0000-4000-8006-000000000004','00000000-0000-4000-8004-000000000003',
   '00000000-0000-4000-8002-000000000001',
   'medication_error','skipped two doses this week because I forgot',
   'missed doses','Medication error','10026749',
   95,'mild',FALSE,ARRAY[]::TEXT[]),
  ('00000000-0000-4000-8007-000000000006','00000000-0000-4000-8000-000000000001',
   '00000000-0000-4000-8006-000000000005','00000000-0000-4000-8004-000000000004',
   '00000000-0000-4000-8002-000000000001',
   'adverse_event','terrible dry cough that will not go away',
   'persistent dry cough','Cough','10011224',
   96,'mild',FALSE,ARRAY[]::TEXT[])
ON CONFLICT (id) DO NOTHING;

INSERT INTO safety_leads
  (id, organization_id, project_id, product_id, patient_id, lead_number,
   status, urgency, is_serious, seriousness_criteria,
   suspected_product, dose, event_description,
   suggested_meddra_pt, suggested_meddra_code,
   onset_date, outcome,
   completeness_score,
   has_identifiable_patient, has_identifiable_reporter,
   has_suspected_product, has_suspected_event,
   missing_fields,
   ai_narrative, ai_confidence, primary_channel, primary_language,
   assigned_to, received_at, sla_due_at)
VALUES
  ('00000000-0000-4000-8008-000000000001',
   '00000000-0000-4000-8000-000000000001',
   '00000000-0000-4000-8003-000000000001',
   '00000000-0000-4000-8002-000000000001',
   '00000000-0000-4000-8004-000000000001',
   'SL-01001',
   'urgent_review','critical',TRUE,ARRAY['life_threatening','medically_important'],
   'CardioPress (Lisinopril)','10mg oral daily',
   'Facial swelling with difficulty swallowing; caregiver confirms confusion and near fall',
   'Angioedema','10002424',
   '2026-06-22','Recovering',
   72,TRUE,TRUE,TRUE,TRUE,
   ARRAY['exact_onset_time','concomitant_medications','hospital_visit_confirmed'],
   'P-7234 reported facial swelling and difficulty swallowing after starting CardioPress 10mg. A caregiver also reported confusion and a near fall. The case is serious due to possible life-threatening angioedema. Human PV review required.',
   91,'app','en',
   '00000000-0000-4000-8001-000000000002',
   NOW() - INTERVAL '2 hours',
   NOW() + INTERVAL '1 hour'),
  ('00000000-0000-4000-8008-000000000002',
   '00000000-0000-4000-8000-000000000001',
   '00000000-0000-4000-8003-000000000001',
   '00000000-0000-4000-8002-000000000001',
   '00000000-0000-4000-8004-000000000002',
   'SL-01002',
   'in_medical_review','urgent',TRUE,ARRAY['medically_important'],
   'CardioPress (Lisinopril)','20mg oral daily',
   'Extreme fatigue with dyspnoea and lower-limb heaviness',
   'Dyspnoea','10013968',
   '2026-06-24','Unknown',
   58,TRUE,TRUE,TRUE,TRUE,
   ARRAY['concomitant_medications','outcome_confirmed','medical_assessment'],
   'P-3421 reported extreme fatigue, breathing difficulty, and heavy legs by phone. Concomitant medicines and outcome are not yet confirmed. Medical review is in progress. Human PV review required.',
   86,'phone','es',
   '00000000-0000-4000-8001-000000000002',
   NOW() - INTERVAL '6 hours',
   NOW() + INTERVAL '18 hours'),
  ('00000000-0000-4000-8008-000000000003',
   '00000000-0000-4000-8000-000000000001',
   '00000000-0000-4000-8003-000000000001',
   '00000000-0000-4000-8002-000000000001',
   '00000000-0000-4000-8004-000000000003',
   'SL-01003',
   'needs_followup','standard',FALSE,ARRAY[]::TEXT[],
   'CardioPress (Lisinopril)','5mg oral daily',
   'Myalgia with two missed doses this week',
   'Myalgia','10028411',
   NULL,'Unknown',
   44,TRUE,TRUE,TRUE,TRUE,
   ARRAY['onset_date','dose_timing','outcome','reason_for_missed_doses'],
   'P-8891 reported persistent limb pain via WhatsApp and disclosed two missed doses. The report includes a possible adverse event and a medication error. Onset date and outcome are unknown. Human PV review required.',
   87,'whatsapp','de',
   NULL,
   NOW() - INTERVAL '4 hours',
   NOW() + INTERVAL '44 hours'),
  ('00000000-0000-4000-8008-000000000004',
   '00000000-0000-4000-8000-000000000001',
   '00000000-0000-4000-8003-000000000001',
   '00000000-0000-4000-8002-000000000001',
   '00000000-0000-4000-8004-000000000004',
   'SL-01004',
   'ai_structured','standard',FALSE,ARRAY[]::TEXT[],
   'CardioPress (Lisinopril)','10mg oral daily',
   'Persistent dry cough since starting medication',
   'Cough','10011224',
   NULL,'Ongoing',
   61,TRUE,TRUE,TRUE,TRUE,
   ARRAY['onset_date','duration','prior_history_of_cough'],
   'P-1145 reported a persistent dry cough via app after starting CardioPress. The event is currently non-serious. Onset date and prior history are missing. Human PV review required.',
   96,'app','de',
   NULL,
   NOW() - INTERVAL '12 hours',
   NOW() + INTERVAL '60 hours')
ON CONFLICT (id) DO NOTHING;

INSERT INTO lead_evidence (lead_id, interaction_id, observation_id, evidence_type) VALUES
  ('00000000-0000-4000-8008-000000000001','00000000-0000-4000-8006-000000000001','00000000-0000-4000-8007-000000000001','primary_interaction'),
  ('00000000-0000-4000-8008-000000000001','00000000-0000-4000-8006-000000000002','00000000-0000-4000-8007-000000000002','caregiver_confirmation'),
  ('00000000-0000-4000-8008-000000000002','00000000-0000-4000-8006-000000000003','00000000-0000-4000-8007-000000000003','primary_interaction'),
  ('00000000-0000-4000-8008-000000000003','00000000-0000-4000-8006-000000000004','00000000-0000-4000-8007-000000000004','primary_interaction'),
  ('00000000-0000-4000-8008-000000000003','00000000-0000-4000-8006-000000000004','00000000-0000-4000-8007-000000000005','primary_interaction'),
  ('00000000-0000-4000-8008-000000000004','00000000-0000-4000-8006-000000000005','00000000-0000-4000-8007-000000000006','primary_interaction')
ON CONFLICT DO NOTHING;

INSERT INTO follow_up_tasks
  (id, organization_id, lead_id, patient_id, task_type, question_text, channel, status, due_at)
VALUES
  ('00000000-0000-4000-8009-000000000001',
   '00000000-0000-4000-8000-000000000001',
   '00000000-0000-4000-8008-000000000003',
   '00000000-0000-4000-8004-000000000003',
   'question_to_patient',
   'When did the muscle pain start? Was it before or after you began the blood pressure medicine?',
   'whatsapp','pending',NOW() + INTERVAL '24 hours'),
  ('00000000-0000-4000-8009-000000000002',
   '00000000-0000-4000-8000-000000000001',
   '00000000-0000-4000-8008-000000000001',
   '00000000-0000-4000-8004-000000000001',
   'question_to_caregiver',
   'Can you confirm whether emergency care was sought for the swelling or swallowing difficulty?',
   'caregiver_app','sent',NOW() + INTERVAL '8 hours')
ON CONFLICT (id) DO NOTHING;

INSERT INTO signal_background_rates
  (reaction_meddra_code, reaction_meddra_pt, background_n, background_total)
VALUES
  ('10002424','Angioedema',45,100000),
  ('10039020','Rhabdomyolysis',12,100000),
  ('10023676','Lactic acidosis',18,100000),
  ('10028411','Myalgia',290,100000),
  ('10062905','Hypomagnesaemia',82,100000),
  ('10011224','Cough',495,100000),
  ('10034835','Peripheral oedema',312,100000),
  ('10028813','Nausea',978,100000),
  ('10047582','Vitamin B12 deficiency',110,100000),
  ('10013968','Dyspnoea',214,100000),
  ('10016173','Fall',156,100000),
  ('10026749','Medication error',89,100000)
ON CONFLICT (reaction_meddra_code) DO NOTHING;

INSERT INTO signals
  (organization_id, project_id, product_id, drug, reaction_meddra_pt, reaction_meddra_code,
   n, prr, prr_lower_ci, prr_upper_ci, ror, ebgm, chi_squared, signal_status)
VALUES
  ('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8003-000000000001',
   '00000000-0000-4000-8002-000000000001',
   'CardioPress','Angioedema','10002424',
   47,4.21,3.18,5.57,4.53,3.91,38.2,'review'),
  ('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8003-000000000001',
   '00000000-0000-4000-8002-000000000001',
   'CardioPress','Cough','10011224',
   156,1.89,1.64,2.18,1.91,1.76,7.2,'monitor'),
  ('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8003-000000000001',
   '00000000-0000-4000-8002-000000000001',
   'CardioPress','Dyspnoea','10013968',
   23,2.41,1.62,3.59,2.46,2.18,12.1,'monitor'),
  ('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8003-000000000001',
   '00000000-0000-4000-8002-000000000001',
   'CardioPress','Peripheral oedema','10034835',
   41,1.54,1.16,2.05,1.55,1.49,3.8,'baseline'),
  ('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8003-000000000001',
   '00000000-0000-4000-8002-000000000001',
   'CardioPress','Myalgia','10028411',
   18,2.34,1.48,3.71,2.38,2.09,10.4,'monitor')
ON CONFLICT (organization_id, drug, reaction_meddra_pt) DO NOTHING;

INSERT INTO model_versions
  (id, organization_id, model_name, version_tag, prompt_hash, notes)
VALUES
  ('00000000-0000-4000-8015-000000000001',
   '00000000-0000-4000-8000-000000000001',
   'gpt-4o-mini','pv-detectors-v1','synthetic-prompt-hash-v1',
   'Initial pilot prompt set for adverse event, medication error, therapeutic failure, and fall risk detection.')
ON CONFLICT (id) DO NOTHING;

INSERT INTO audit_log
  (organization_id, project_id, user_id, action, entity_type, entity_id, new_state)
VALUES
  ('00000000-0000-4000-8000-000000000001',
   '00000000-0000-4000-8003-000000000001',
   '00000000-0000-4000-8001-000000000001',
   'seed.loaded','system','00000000-0000-4000-8003-000000000001',
   '{"source":"006_seed.sql","brief":"VIGIL Codex Brief 01"}');

SELECT setval('lead_seq', 1004, TRUE);
