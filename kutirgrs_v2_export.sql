--
-- PostgreSQL database dump
--

\restrict CuDXdnnMQj5wDerTkDx0JMf54HvWhYJcfNTMiRmml9YlJJd8B9JR0ifDbD93X08

-- Dumped from database version 18.6
-- Dumped by pg_dump version 18.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: areas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.areas (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    code character varying(20),
    district_id integer NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    education_coordinator_id integer
);


--
-- Name: areas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.areas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: areas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.areas_id_seq OWNED BY public.areas.id;


--
-- Name: categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categories (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    code character varying(20),
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


--
-- Name: categories_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.categories_id_seq OWNED BY public.categories.id;


--
-- Name: clusters; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clusters (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    code character varying(20),
    area_id integer NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    cluster_coordinator_id integer
);


--
-- Name: clusters_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.clusters_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: clusters_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.clusters_id_seq OWNED BY public.clusters.id;


--
-- Name: districts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.districts (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    code character varying(20),
    zone_id integer NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    district_anchor_id integer
);


--
-- Name: districts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.districts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: districts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.districts_id_seq OWNED BY public.districts.id;


--
-- Name: donors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.donors (
    id integer NOT NULL,
    name character varying(200) NOT NULL,
    contact character varying(100),
    notes text,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


--
-- Name: donors_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.donors_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: donors_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.donors_id_seq OWNED BY public.donors.id;


--
-- Name: exam_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.exam_categories (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    code character varying(20),
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


--
-- Name: exam_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.exam_categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: exam_categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.exam_categories_id_seq OWNED BY public.exam_categories.id;


--
-- Name: exam_centers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.exam_centers (
    id integer NOT NULL,
    name character varying(200) NOT NULL,
    district_id integer,
    street character varying(200),
    city character varying(100),
    state character varying(50),
    pincode character varying(10),
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


--
-- Name: exam_centers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.exam_centers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: exam_centers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.exam_centers_id_seq OWNED BY public.exam_centers.id;


--
-- Name: kutir_visits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.kutir_visits (
    id integer NOT NULL,
    kutir_id integer NOT NULL,
    visited_by_id integer,
    visit_date date NOT NULL,
    avg_attendance_last_week integer NOT NULL,
    follow_timetable boolean NOT NULL,
    follow_monthly_plan boolean NOT NULL,
    timetable_plan_reason text,
    math_topics_pre text,
    math_topics_upper text,
    english_topics_pre text,
    english_topics_upper text,
    timeslot_utilization boolean NOT NULL,
    timeslot_reason text,
    grs_prep_remarks text,
    physical_vs_registered character varying(15) NOT NULL,
    workbook_percentage integer NOT NULL,
    workbook_completion character varying(20) NOT NULL,
    book_availability character varying(25) NOT NULL,
    cleanliness smallint NOT NULL,
    hindi_proficiency smallint NOT NULL,
    english_proficiency smallint NOT NULL,
    maths_proficiency smallint NOT NULL,
    evs_proficiency smallint NOT NULL,
    reasoning_proficiency smallint NOT NULL,
    material_management smallint NOT NULL,
    kutir_performance smallint NOT NULL,
    reg_admission_forms boolean NOT NULL,
    reg_attendance_students boolean NOT NULL,
    reg_daily_activity boolean NOT NULL,
    reg_observation boolean NOT NULL,
    reg_students_data boolean NOT NULL,
    reg_attendance_teachers boolean NOT NULL,
    reg_students_documents boolean NOT NULL,
    regular_students integer,
    timeslot_bal_sabha boolean NOT NULL,
    timeslot_sports boolean NOT NULL,
    timeslot_yoga boolean NOT NULL,
    timeslot_value_ed boolean NOT NULL,
    timeslot_gk_map boolean NOT NULL,
    visit_photo character varying(300),
    final_remarks text,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


--
-- Name: kutir_visits_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.kutir_visits_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: kutir_visits_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.kutir_visits_id_seq OWNED BY public.kutir_visits.id;


--
-- Name: kutirs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.kutirs (
    id integer NOT NULL,
    name character varying(200) NOT NULL,
    kutir_type character varying(20) NOT NULL,
    cluster_id integer NOT NULL,
    district_id integer,
    village character varying(100),
    street character varying(200),
    state character varying(50) NOT NULL,
    pincode character varying(10),
    teacher_id integer,
    donor_id integer,
    enrollment_5th smallint,
    enrollment_8th smallint,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


--
-- Name: kutirs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.kutirs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: kutirs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.kutirs_id_seq OWNED BY public.kutirs.id;


--
-- Name: no_admit_reasons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.no_admit_reasons (
    id integer NOT NULL,
    reason character varying(200) NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


--
-- Name: no_admit_reasons_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.no_admit_reasons_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: no_admit_reasons_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.no_admit_reasons_id_seq OWNED BY public.no_admit_reasons.id;


--
-- Name: no_exam_reasons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.no_exam_reasons (
    id integer NOT NULL,
    reason character varying(200) NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


--
-- Name: no_exam_reasons_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.no_exam_reasons_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: no_exam_reasons_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.no_exam_reasons_id_seq OWNED BY public.no_exam_reasons.id;


--
-- Name: school_type_subject_subjects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.school_type_subject_subjects (
    school_type_subject_id integer NOT NULL,
    subject_id integer NOT NULL
);


--
-- Name: school_type_subjects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.school_type_subjects (
    id integer NOT NULL,
    school_type character varying(20) NOT NULL
);


--
-- Name: school_type_subjects_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.school_type_subjects_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: school_type_subjects_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.school_type_subjects_id_seq OWNED BY public.school_type_subjects.id;


--
-- Name: schools; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.schools (
    id integer NOT NULL,
    name character varying(200) NOT NULL,
    school_type character varying(20) NOT NULL,
    street character varying(200),
    city character varying(100),
    district_id integer,
    state character varying(50) NOT NULL,
    pincode character varying(10),
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


--
-- Name: schools_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.schools_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: schools_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.schools_id_seq OWNED BY public.schools.id;


--
-- Name: student_exam_scores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.student_exam_scores (
    id integer NOT NULL,
    exam_id integer NOT NULL,
    subject_id integer NOT NULL,
    score numeric(5,2)
);


--
-- Name: student_exam_scores_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.student_exam_scores_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: student_exam_scores_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.student_exam_scores_id_seq OWNED BY public.student_exam_scores.id;


--
-- Name: student_exams; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.student_exams (
    id integer NOT NULL,
    student_id integer NOT NULL,
    school_id integer NOT NULL,
    school_start_year smallint NOT NULL,
    eligible boolean NOT NULL,
    form_received boolean NOT NULL,
    applied boolean NOT NULL,
    appeared boolean NOT NULL,
    selected boolean NOT NULL,
    admitted boolean NOT NULL,
    admitted_school_id integer,
    no_admit_reason_id integer,
    exam_category_id integer,
    application_number character varying(50),
    exam_center_id integer,
    roll_number character varying(50),
    no_exam_reason_id integer,
    math numeric(5,2),
    english numeric(5,2),
    reasoning numeric(5,2),
    evs numeric(5,2),
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


--
-- Name: student_exams_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.student_exams_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: student_exams_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.student_exams_id_seq OWNED BY public.student_exams.id;


--
-- Name: student_progress; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.student_progress (
    id integer NOT NULL,
    student_id integer NOT NULL,
    school_id integer NOT NULL,
    academic_year integer NOT NULL,
    grade integer NOT NULL,
    is_enrolled boolean NOT NULL,
    exit_reason character varying(20),
    previous_year_percentage numeric(5,2),
    remarks text,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


--
-- Name: student_progress_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.student_progress_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: student_progress_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.student_progress_id_seq OWNED BY public.student_progress.id;


--
-- Name: students; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.students (
    id integer NOT NULL,
    kutir_id integer,
    first_name character varying(100) NOT NULL,
    last_name character varying(100) NOT NULL,
    photo character varying(300),
    gender character varying(10) NOT NULL,
    dob date,
    street character varying(200),
    pincode character varying(10),
    phone character varying(20),
    email character varying(254),
    father_name character varying(150),
    mother_name character varying(150),
    category_id integer,
    sub_category_id integer,
    alt_contact_name character varying(150),
    alt_contact_phone character varying(20),
    aadhaar boolean NOT NULL,
    category_cert boolean NOT NULL,
    birth_cert boolean NOT NULL,
    residence_proof boolean NOT NULL,
    medical boolean NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


--
-- Name: students_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.students_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: students_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.students_id_seq OWNED BY public.students.id;


--
-- Name: sub_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sub_categories (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    code character varying(20),
    category_id integer NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


--
-- Name: sub_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sub_categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sub_categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sub_categories_id_seq OWNED BY public.sub_categories.id;


--
-- Name: subjects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subjects (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    code character varying(20),
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


--
-- Name: subjects_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.subjects_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: subjects_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.subjects_id_seq OWNED BY public.subjects.id;


--
-- Name: user_areas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_areas (
    user_id integer NOT NULL,
    area_id integer NOT NULL
);


--
-- Name: user_clusters; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_clusters (
    user_id integer NOT NULL,
    cluster_id integer NOT NULL
);


--
-- Name: user_districts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_districts (
    user_id integer NOT NULL,
    district_id integer NOT NULL
);


--
-- Name: user_kutirs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_kutirs (
    user_id integer NOT NULL,
    kutir_id integer NOT NULL
);


--
-- Name: user_zones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_zones (
    user_id integer NOT NULL,
    zone_id integer NOT NULL
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username character varying(150) NOT NULL,
    email character varying(254),
    first_name character varying(150),
    last_name character varying(150),
    phone character varying(20),
    title character varying(50),
    password character varying(128) NOT NULL,
    is_active boolean NOT NULL,
    is_superuser boolean NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: zones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.zones (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    code character varying(20),
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    zonal_head_id integer
);


--
-- Name: zones_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.zones_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: zones_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.zones_id_seq OWNED BY public.zones.id;


--
-- Name: areas id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.areas ALTER COLUMN id SET DEFAULT nextval('public.areas_id_seq'::regclass);


--
-- Name: categories id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories ALTER COLUMN id SET DEFAULT nextval('public.categories_id_seq'::regclass);


--
-- Name: clusters id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clusters ALTER COLUMN id SET DEFAULT nextval('public.clusters_id_seq'::regclass);


--
-- Name: districts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.districts ALTER COLUMN id SET DEFAULT nextval('public.districts_id_seq'::regclass);


--
-- Name: donors id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.donors ALTER COLUMN id SET DEFAULT nextval('public.donors_id_seq'::regclass);


--
-- Name: exam_categories id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_categories ALTER COLUMN id SET DEFAULT nextval('public.exam_categories_id_seq'::regclass);


--
-- Name: exam_centers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_centers ALTER COLUMN id SET DEFAULT nextval('public.exam_centers_id_seq'::regclass);


--
-- Name: kutir_visits id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kutir_visits ALTER COLUMN id SET DEFAULT nextval('public.kutir_visits_id_seq'::regclass);


--
-- Name: kutirs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kutirs ALTER COLUMN id SET DEFAULT nextval('public.kutirs_id_seq'::regclass);


--
-- Name: no_admit_reasons id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.no_admit_reasons ALTER COLUMN id SET DEFAULT nextval('public.no_admit_reasons_id_seq'::regclass);


--
-- Name: no_exam_reasons id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.no_exam_reasons ALTER COLUMN id SET DEFAULT nextval('public.no_exam_reasons_id_seq'::regclass);


--
-- Name: school_type_subjects id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.school_type_subjects ALTER COLUMN id SET DEFAULT nextval('public.school_type_subjects_id_seq'::regclass);


--
-- Name: schools id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schools ALTER COLUMN id SET DEFAULT nextval('public.schools_id_seq'::regclass);


--
-- Name: student_exam_scores id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_exam_scores ALTER COLUMN id SET DEFAULT nextval('public.student_exam_scores_id_seq'::regclass);


--
-- Name: student_exams id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_exams ALTER COLUMN id SET DEFAULT nextval('public.student_exams_id_seq'::regclass);


--
-- Name: student_progress id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_progress ALTER COLUMN id SET DEFAULT nextval('public.student_progress_id_seq'::regclass);


--
-- Name: students id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.students ALTER COLUMN id SET DEFAULT nextval('public.students_id_seq'::regclass);


--
-- Name: sub_categories id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sub_categories ALTER COLUMN id SET DEFAULT nextval('public.sub_categories_id_seq'::regclass);


--
-- Name: subjects id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subjects ALTER COLUMN id SET DEFAULT nextval('public.subjects_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: zones id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zones ALTER COLUMN id SET DEFAULT nextval('public.zones_id_seq'::regclass);


--
-- Data for Name: areas; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.areas (id, name, code, district_id, created_at, updated_at, education_coordinator_id) FROM stdin;
94	Alirajpur	\N	64	2026-09-10 18:17:40.607624+05:30	2026-09-10 18:17:40.607625+05:30	\N
95	Barwani	\N	77	2026-09-10 18:17:40.607625+05:30	2026-09-10 18:17:40.607625+05:30	\N
96	Jhabua	\N	76	2026-09-10 18:17:40.607625+05:30	2026-09-10 18:17:40.607625+05:30	\N
97	Ratlam	\N	73	2026-09-10 18:17:40.607626+05:30	2026-09-10 18:17:40.607626+05:30	\N
98	Dhar	\N	84	2026-09-10 18:17:40.607626+05:30	2026-09-10 18:17:40.607626+05:30	\N
99	Rajendragram	\N	67	2026-09-10 18:17:40.607626+05:30	2026-09-10 18:17:40.607626+05:30	\N
100	Karpa	\N	67	2026-09-10 18:17:40.607627+05:30	2026-09-10 18:17:40.607627+05:30	\N
101	Sarai	\N	67	2026-09-10 18:17:40.607627+05:30	2026-09-10 18:17:40.607627+05:30	\N
102	Shahdol	\N	81	2026-09-10 18:17:40.607627+05:30	2026-09-10 18:17:40.607627+05:30	\N
103	Balaghat	\N	62	2026-09-10 18:17:40.607628+05:30	2026-09-10 18:17:40.607628+05:30	\N
104	Bajak	\N	80	2026-09-10 18:17:40.607628+05:30	2026-09-10 18:17:40.607628+05:30	\N
105	Gadasarai	\N	80	2026-09-10 18:17:40.607628+05:30	2026-09-10 18:17:40.607628+05:30	\N
106	Mawai	\N	87	2026-09-10 18:17:40.607628+05:30	2026-09-10 18:17:40.607629+05:30	\N
107	Mandla	\N	87	2026-09-10 18:17:40.607629+05:30	2026-09-10 18:17:40.607629+05:30	\N
108	Seoni	\N	63	2026-09-10 18:17:40.607629+05:30	2026-09-10 18:17:40.607629+05:30	\N
109	Bhimpur	\N	68	2026-09-10 18:17:40.607629+05:30	2026-09-10 18:17:40.60763+05:30	\N
110	Rambha	\N	68	2026-09-10 18:17:40.60763+05:30	2026-09-10 18:17:40.60763+05:30	\N
111	Damjipura	\N	68	2026-09-10 18:17:40.60763+05:30	2026-09-10 18:17:40.60763+05:30	\N
112	Tamia	\N	69	2026-09-10 18:17:40.60763+05:30	2026-09-10 18:17:40.60763+05:30	\N
113	Harrai	\N	69	2026-09-10 18:17:40.607631+05:30	2026-09-10 18:17:40.607631+05:30	\N
114	Batka	\N	69	2026-09-10 18:17:40.607631+05:30	2026-09-10 18:17:40.607631+05:30	\N
115	Patalkot	\N	69	2026-09-10 18:17:40.607631+05:30	2026-09-10 18:17:40.607631+05:30	\N
116	Burhanpur	\N	65	2026-09-10 18:17:40.607632+05:30	2026-09-10 18:17:40.607632+05:30	\N
117	Dewas	\N	78	2026-09-10 18:17:40.607632+05:30	2026-09-10 18:17:40.607632+05:30	\N
118	Rahatgaon	\N	86	2026-09-10 18:17:40.607632+05:30	2026-09-10 18:17:40.607632+05:30	\N
119	Sirali	\N	86	2026-09-10 18:17:40.607633+05:30	2026-09-10 18:17:40.607633+05:30	\N
120	Khalwa	\N	66	2026-09-10 18:17:40.607633+05:30	2026-09-10 18:17:40.607633+05:30	\N
121	Gulai	\N	66	2026-09-10 18:17:40.607633+05:30	2026-09-10 18:17:40.607633+05:30	\N
122	Khargone	\N	79	2026-09-10 18:17:40.607634+05:30	2026-09-10 18:17:40.607634+05:30	\N
123	Sehore	\N	70	2026-09-10 18:17:40.607634+05:30	2026-09-10 18:17:40.607634+05:30	\N
124	Karahal	\N	71	2026-09-10 18:17:40.607634+05:30	2026-09-10 18:17:40.607634+05:30	\N
125	Veerpur	\N	71	2026-09-10 18:17:40.607635+05:30	2026-09-10 18:17:40.607635+05:30	\N
126	Sheopur	\N	71	2026-09-10 18:17:40.607635+05:30	2026-09-10 18:17:40.607635+05:30	\N
127	Shivpuri	\N	72	2026-09-10 18:17:40.607635+05:30	2026-09-10 18:17:40.607635+05:30	\N
128	Guna	\N	74	2026-09-10 18:17:40.607635+05:30	2026-09-10 18:17:40.607636+05:30	\N
129	Vidisha	\N	75	2026-09-10 18:17:40.607636+05:30	2026-09-10 18:17:40.607636+05:30	\N
130	Sidhi	\N	82	2026-09-10 18:17:40.607636+05:30	2026-09-10 18:17:40.607636+05:30	\N
131	Singrauli	\N	85	2026-09-10 18:17:40.607636+05:30	2026-09-10 18:17:40.607636+05:30	\N
\.


--
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.categories (id, name, code, created_at, updated_at) FROM stdin;
1	SC	\N	2026-09-10 19:00:44.648248+05:30	2026-09-10 19:00:44.648257+05:30
2	ST	\N	2026-09-10 19:01:27.762723+05:30	2026-09-10 19:01:27.762728+05:30
4	General	\N	2026-09-10 19:11:47.478967+05:30	2026-09-10 19:11:47.478976+05:30
6	OBC	\N	2026-09-10 19:26:20.310781+05:30	2026-09-10 19:26:20.310787+05:30
\.


--
-- Data for Name: clusters; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.clusters (id, name, code, area_id, created_at, updated_at, cluster_coordinator_id) FROM stdin;
34	Devpura	\N	127	2026-09-10 18:17:40.6108+05:30	2026-09-10 18:17:40.6108+05:30	\N
35	Majhigawan	\N	130	2026-09-10 18:17:40.610801+05:30	2026-09-10 18:17:40.610801+05:30	\N
36	Dharmapuri	\N	122	2026-09-10 18:17:40.610801+05:30	2026-09-10 18:17:40.610801+05:30	\N
37	Chilakda, Karajwani	\N	94	2026-09-10 18:17:40.610801+05:30	2026-09-10 18:17:40.610801+05:30	\N
38	Eklera, Umar	\N	117	2026-09-10 18:17:40.610802+05:30	2026-09-10 18:17:40.610802+05:30	\N
39	Mahi	\N	96	2026-09-10 18:17:40.610802+05:30	2026-09-10 18:17:40.610802+05:30	\N
40	Atraila	\N	130	2026-09-10 18:17:40.610802+05:30	2026-09-10 18:17:40.610802+05:30	\N
41	Pahadi	\N	126	2026-09-10 18:17:40.610802+05:30	2026-09-10 18:17:40.610803+05:30	\N
42	Moravan	\N	126	2026-09-10 18:17:40.610803+05:30	2026-09-10 18:17:40.610803+05:30	\N
43	Magardha	\N	108	2026-09-10 18:17:40.610803+05:30	2026-09-10 18:17:40.610803+05:30	\N
44	Tongra	\N	126	2026-09-10 18:17:40.610803+05:30	2026-09-10 18:17:40.610804+05:30	\N
45	Devpura	\N	123	2026-09-10 18:17:40.610804+05:30	2026-09-10 18:17:40.610804+05:30	\N
46	Kantaphod	\N	117	2026-09-10 18:17:40.610804+05:30	2026-09-10 18:17:40.610804+05:30	\N
47	Kariyadeh	\N	126	2026-09-10 18:17:40.610804+05:30	2026-09-10 18:17:40.610804+05:30	\N
48	Ratatalai	\N	117	2026-09-10 18:17:40.610805+05:30	2026-09-10 18:17:40.610805+05:30	\N
49	Heerapur	\N	126	2026-09-10 18:17:40.610805+05:30	2026-09-10 18:17:40.610805+05:30	\N
50	Punjapura, Ratatalai	\N	117	2026-09-10 18:17:40.610805+05:30	2026-09-10 18:17:40.610805+05:30	\N
51	Murum	\N	103	2026-09-10 18:17:40.610806+05:30	2026-09-10 18:17:40.610806+05:30	\N
52	Gata	\N	94	2026-09-10 18:17:40.610806+05:30	2026-09-10 18:17:40.610806+05:30	\N
53	Semarkhero	\N	103	2026-09-10 18:17:40.610806+05:30	2026-09-10 18:17:40.610806+05:30	\N
54	Sattalai	\N	122	2026-09-10 18:17:40.610806+05:30	2026-09-10 18:17:40.610807+05:30	\N
55	Rampura	\N	127	2026-09-10 18:17:40.610807+05:30	2026-09-10 18:17:40.610807+05:30	\N
56	Dhanayacha, Sironi	\N	126	2026-09-10 18:17:40.610807+05:30	2026-09-10 18:17:40.610807+05:30	\N
57	Rauhal	\N	130	2026-09-10 18:17:40.610807+05:30	2026-09-10 18:17:40.610807+05:30	\N
58	Silpuri	\N	126	2026-09-10 18:17:40.610808+05:30	2026-09-10 18:17:40.610808+05:30	\N
59	Chakaldi, Nayapura	\N	123	2026-09-10 18:17:40.610808+05:30	2026-09-10 18:17:40.610808+05:30	\N
60	Mathmath	\N	96	2026-09-10 18:17:40.610808+05:30	2026-09-10 18:17:40.610808+05:30	\N
61	Harla Cluster	\N	95	2026-09-10 18:17:40.610809+05:30	2026-09-10 18:17:40.610809+05:30	\N
62	Pyaripura	\N	126	2026-09-10 18:17:40.610809+05:30	2026-09-10 18:17:40.610809+05:30	\N
63	Dhanayacha	\N	126	2026-09-10 18:17:40.610809+05:30	2026-09-10 18:17:40.610809+05:30	\N
64	Khawasa	\N	96	2026-09-10 18:17:40.610809+05:30	2026-09-10 18:17:40.61081+05:30	\N
65	Bhotoopura	\N	126	2026-09-10 18:17:40.61081+05:30	2026-09-10 18:17:40.61081+05:30	\N
66	Chilakda, Roshiya	\N	94	2026-09-10 18:17:40.61081+05:30	2026-09-10 18:17:40.61081+05:30	\N
67	Awada, Bhela, Heerapur, Pyaripura	\N	126	2026-09-10 18:17:40.61081+05:30	2026-09-10 18:17:40.610811+05:30	\N
68	Umrai	\N	127	2026-09-10 18:17:40.610811+05:30	2026-09-10 18:17:40.610811+05:30	\N
69	Semliya Cluster	\N	97	2026-09-10 18:17:40.610811+05:30	2026-09-10 18:17:40.610811+05:30	\N
70	Budhera	\N	126	2026-09-10 18:17:40.610811+05:30	2026-09-10 18:17:40.610812+05:30	\N
71	Gara Cluster	\N	95	2026-09-10 18:17:40.610812+05:30	2026-09-10 18:17:40.610812+05:30	\N
72	Bondari	\N	103	2026-09-10 18:17:40.610812+05:30	2026-09-10 18:17:40.610812+05:30	\N
73	Aamwala, Bhotoopura, Kuno, Moravan, Sesaipura	\N	126	2026-09-10 18:17:40.610812+05:30	2026-09-10 18:17:40.610812+05:30	\N
74	Sironi	\N	126	2026-09-10 18:17:40.610813+05:30	2026-09-10 18:17:40.610813+05:30	\N
75	Shivni	\N	95	2026-09-10 18:17:40.610813+05:30	2026-09-10 18:17:40.610813+05:30	\N
76	Aamwala	\N	126	2026-09-10 18:17:40.610813+05:30	2026-09-10 18:17:40.610813+05:30	\N
77	Chubhawal	\N	107	2026-09-10 18:17:40.610814+05:30	2026-09-10 18:17:40.610814+05:30	\N
78	Kuli	\N	95	2026-09-10 18:17:40.610814+05:30	2026-09-10 18:17:40.610814+05:30	\N
79	Laxmipura	\N	127	2026-09-10 18:17:40.610814+05:30	2026-09-10 18:17:40.610814+05:30	\N
80	Binti Cluster	\N	97	2026-09-10 18:17:40.610814+05:30	2026-09-10 18:17:40.610815+05:30	\N
81	Gothra	\N	126	2026-09-10 18:17:40.610815+05:30	2026-09-10 18:17:40.610815+05:30	\N
82	Nagpokhar	\N	130	2026-09-10 18:17:40.610815+05:30	2026-09-10 18:17:40.610815+05:30	\N
83	Jhaprahva	\N	131	2026-09-10 18:17:40.610815+05:30	2026-09-10 18:17:40.610816+05:30	\N
84	Mahdewa	\N	127	2026-09-10 18:17:40.610816+05:30	2026-09-10 18:17:40.610816+05:30	\N
85	Bhitada	\N	94	2026-09-10 18:17:40.610816+05:30	2026-09-10 18:17:40.610816+05:30	\N
86	Mugwani	\N	107	2026-09-10 18:17:40.610816+05:30	2026-09-10 18:17:40.610817+05:30	\N
87	Chagohar	\N	130	2026-09-10 18:17:40.610817+05:30	2026-09-10 18:17:40.610817+05:30	\N
88	Piprahwa	\N	131	2026-09-10 18:17:40.610817+05:30	2026-09-10 18:17:40.610817+05:30	\N
89	Kiti	\N	94	2026-09-10 18:17:40.610817+05:30	2026-09-10 18:17:40.610817+05:30	\N
90	Budhera, Dhanayacha, Gothra, Pahadi, Sironi	\N	126	2026-09-10 18:17:40.610818+05:30	2026-09-10 18:17:40.610818+05:30	\N
91	Mahloni	\N	127	2026-09-10 18:17:40.610818+05:30	2026-09-10 18:17:40.610818+05:30	\N
92	Semari	\N	128	2026-09-10 18:17:40.610818+05:30	2026-09-10 18:17:40.610818+05:30	\N
93	Gara Cluster, Harla Cluster, Kherwani Cluster, Kuli, Ranipura Cluster, Shivni	\N	95	2026-09-10 18:17:40.610819+05:30	2026-09-10 18:17:40.610819+05:30	\N
94	Nichli	\N	108	2026-09-10 18:17:40.610819+05:30	2026-09-10 18:17:40.610819+05:30	\N
95	Awada	\N	126	2026-09-10 18:17:40.610819+05:30	2026-09-10 18:17:40.610819+05:30	\N
96	Kalibel	\N	94	2026-09-10 18:17:40.610819+05:30	2026-09-10 18:17:40.61082+05:30	\N
97	Bhela	\N	126	2026-09-10 18:17:40.61082+05:30	2026-09-10 18:17:40.61082+05:30	\N
98	Bankuri	\N	126	2026-09-10 18:17:40.61082+05:30	2026-09-10 18:17:40.61082+05:30	\N
99	Khategaon	\N	117	2026-09-10 18:17:40.61082+05:30	2026-09-10 18:17:40.61082+05:30	\N
100	Karwad	\N	96	2026-09-10 18:17:40.610821+05:30	2026-09-10 18:17:40.610821+05:30	\N
101	Kuno	\N	126	2026-09-10 18:17:40.610821+05:30	2026-09-10 18:17:40.610821+05:30	\N
102	Machhariya	\N	108	2026-09-10 18:17:40.610821+05:30	2026-09-10 18:17:40.610821+05:30	\N
103	Kakraj	\N	129	2026-09-10 18:17:40.610821+05:30	2026-09-10 18:17:40.610822+05:30	\N
104	Machwas	\N	117	2026-09-10 18:17:40.610822+05:30	2026-09-10 18:17:40.610822+05:30	\N
105	Suda	\N	131	2026-09-10 18:17:40.610822+05:30	2026-09-10 18:17:40.610822+05:30	\N
106	Parasari	\N	127	2026-09-10 18:17:40.610822+05:30	2026-09-10 18:17:40.610823+05:30	\N
107	Machla	\N	107	2026-09-10 18:17:40.610823+05:30	2026-09-10 18:17:40.610823+05:30	\N
108	Narsinghpura, Rupapada	\N	96	2026-09-10 18:17:40.610823+05:30	2026-09-10 18:17:40.610823+05:30	\N
109	Valpanee	\N	122	2026-09-10 18:17:40.610824+05:30	2026-09-10 18:17:40.610824+05:30	\N
\.


--
-- Data for Name: districts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.districts (id, name, code, zone_id, created_at, updated_at, district_anchor_id) FROM stdin;
62	Balaghat	\N	21	2026-09-10 18:17:40.604491+05:30	2026-09-10 18:17:40.604492+05:30	\N
63	Seoni	\N	21	2026-09-10 18:17:40.604492+05:30	2026-09-10 18:17:40.604492+05:30	\N
64	Alirajpur	\N	23	2026-09-10 18:17:40.604493+05:30	2026-09-10 18:17:40.604493+05:30	\N
65	Burhanpur	\N	20	2026-09-10 18:17:40.604493+05:30	2026-09-10 18:17:40.604493+05:30	\N
66	Khandwa	\N	20	2026-09-10 18:17:40.604493+05:30	2026-09-10 18:17:40.604494+05:30	\N
67	Anuppur	\N	26	2026-09-10 18:17:40.604494+05:30	2026-09-10 18:17:40.604494+05:30	\N
68	Betul	\N	24	2026-09-10 18:17:40.604494+05:30	2026-09-10 18:17:40.604494+05:30	\N
69	Chhindwara	\N	24	2026-09-10 18:17:40.604494+05:30	2026-09-10 18:17:40.604495+05:30	\N
70	Sehore	\N	20	2026-09-10 18:17:40.604495+05:30	2026-09-10 18:17:40.604495+05:30	\N
71	Sheopur	\N	22	2026-09-10 18:17:40.604495+05:30	2026-09-10 18:17:40.604495+05:30	\N
72	Shivpuri	\N	22	2026-09-10 18:17:40.604495+05:30	2026-09-10 18:17:40.604496+05:30	\N
73	Ratlam	\N	23	2026-09-10 18:17:40.604496+05:30	2026-09-10 18:17:40.604496+05:30	\N
74	Guna	\N	22	2026-09-10 18:17:40.604496+05:30	2026-09-10 18:17:40.604496+05:30	\N
75	Vidisha	\N	22	2026-09-10 18:17:40.604496+05:30	2026-09-10 18:17:40.604496+05:30	\N
76	Jhabua	\N	23	2026-09-10 18:17:40.604497+05:30	2026-09-10 18:17:40.604497+05:30	\N
77	Barwani	\N	23	2026-09-10 18:17:40.604497+05:30	2026-09-10 18:17:40.604497+05:30	\N
78	Dewas	\N	20	2026-09-10 18:17:40.604497+05:30	2026-09-10 18:17:40.604497+05:30	\N
79	Khargone	\N	20	2026-09-10 18:17:40.604498+05:30	2026-09-10 18:17:40.604498+05:30	\N
80	Dindori	\N	21	2026-09-10 18:17:40.604498+05:30	2026-09-10 18:17:40.604498+05:30	\N
81	Shahdol	\N	26	2026-09-10 18:17:40.604498+05:30	2026-09-10 18:17:40.604498+05:30	\N
82	Sidhi	\N	25	2026-09-10 18:17:40.604499+05:30	2026-09-10 18:17:40.604499+05:30	\N
83	Gaurela-Pendra-Marwahi	\N	26	2026-09-10 18:17:40.604499+05:30	2026-09-10 18:17:40.604499+05:30	\N
84	Dhar	\N	23	2026-09-10 18:17:40.604499+05:30	2026-09-10 18:17:40.604499+05:30	\N
85	Singrauli	\N	25	2026-09-10 18:17:40.6045+05:30	2026-09-10 18:17:40.6045+05:30	\N
86	Harda	\N	20	2026-09-10 18:17:40.6045+05:30	2026-09-10 18:17:40.6045+05:30	\N
87	Mandla	\N	21	2026-09-10 18:17:40.6045+05:30	2026-09-10 18:17:40.6045+05:30	\N
\.


--
-- Data for Name: donors; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.donors (id, name, contact, notes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: exam_categories; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.exam_categories (id, name, code, created_at, updated_at) FROM stdin;
4	OBC rural	\N	2026-09-10 19:39:25.724841+05:30	2026-09-10 19:39:25.724847+05:30
5	ST Urban	\N	2026-09-10 19:39:33.440721+05:30	2026-09-10 19:39:33.440727+05:30
\.


--
-- Data for Name: exam_centers; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.exam_centers (id, name, district_id, street, city, state, pincode, created_at, updated_at) FROM stdin;
2	EMRS Centera	67	sdadf	Sandalpur	Madhya Pradesh	34343	2026-09-11 13:11:58.802519+05:30	2026-09-11 13:11:58.802526+05:30
3	Govt. HS School Chhindwara	69	\N	Chhindwara	Madhya Pradesh	480001	2026-09-11 15:16:51.75328+05:30	2026-09-11 15:16:51.75328+05:30
4	Govt. HS School Betul	68	\N	Betul	Madhya Pradesh	460001	2026-09-11 15:16:51.75328+05:30	2026-09-11 15:16:51.75328+05:30
5	Govt. HS School Dindori	80	\N	Dindori	Madhya Pradesh	481880	2026-09-11 15:16:51.75328+05:30	2026-09-11 15:16:51.75328+05:30
6	Govt. HS School Anuppur	67	\N	Anuppur	Madhya Pradesh	484224	2026-09-11 15:16:51.75328+05:30	2026-09-11 15:16:51.75328+05:30
7	Govt. HS School Dewas	78	\N	Dewas	Madhya Pradesh	455001	2026-09-11 15:16:51.75328+05:30	2026-09-11 15:16:51.75328+05:30
8	Kendriya Vidyalaya Chhindwara	69	\N	Chhindwara	Madhya Pradesh	480001	2026-09-11 15:16:51.75328+05:30	2026-09-11 15:16:51.75328+05:30
9	Govt. HS School Barwani	77	\N	Barwani	Madhya Pradesh	451551	2026-09-11 15:16:51.75328+05:30	2026-09-11 15:16:51.75328+05:30
10	Govt. HS School Dhar	84	\N	Dhar	Madhya Pradesh	454001	2026-09-11 15:16:51.75328+05:30	2026-09-11 15:16:51.75328+05:30
11	Govt. HS School Khargone	79	\N	Khargone	Madhya Pradesh	451001	2026-09-11 15:16:51.75328+05:30	2026-09-11 15:16:51.75328+05:30
12	Kendriya Vidyalaya Balaghat	62	\N	Balaghat	Madhya Pradesh	481001	2026-09-11 15:16:51.75328+05:30	2026-09-11 15:16:51.75328+05:30
13	Govt. HS School Alirajpur	64	\N	Alirajpur	Madhya Pradesh	457887	2026-09-11 15:16:51.75328+05:30	2026-09-11 15:16:51.75328+05:30
14	Govt. HS School Mandla	87	\N	Mandla	Madhya Pradesh	481661	2026-09-11 15:16:51.75328+05:30	2026-09-11 15:16:51.75328+05:30
15	Govt. HS School Shahdol	81	\N	Shahdol	Madhya Pradesh	484001	2026-09-11 15:16:51.75328+05:30	2026-09-11 15:16:51.75328+05:30
16	Govt. HS School Sidhi	82	\N	Sidhi	Madhya Pradesh	486661	2026-09-11 15:16:51.75328+05:30	2026-09-11 15:16:51.75328+05:30
\.


--
-- Data for Name: kutir_visits; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.kutir_visits (id, kutir_id, visited_by_id, visit_date, avg_attendance_last_week, follow_timetable, follow_monthly_plan, timetable_plan_reason, math_topics_pre, math_topics_upper, english_topics_pre, english_topics_upper, timeslot_utilization, timeslot_reason, grs_prep_remarks, physical_vs_registered, workbook_percentage, workbook_completion, book_availability, cleanliness, hindi_proficiency, english_proficiency, maths_proficiency, evs_proficiency, reasoning_proficiency, material_management, kutir_performance, reg_admission_forms, reg_attendance_students, reg_daily_activity, reg_observation, reg_students_data, reg_attendance_teachers, reg_students_documents, regular_students, timeslot_bal_sabha, timeslot_sports, timeslot_yoga, timeslot_value_ed, timeslot_gk_map, visit_photo, final_remarks, created_at, updated_at) FROM stdin;
1	1	\N	2026-09-11	12	t	t	\N	asdf	asdf	asdf	asdf	f	\N	sdf	Matched	34	Upto Date	Sufficient	3	4	5	3	3	3	5	3	f	f	t	t	t	f	f	10	t	t	t	t	t	visit_photos/7ac7be7a-aec0-4bea-80a0-a8a10dbc2c05.jpeg	asdf	2026-09-11 06:23:46.400334+05:30	2026-09-11 06:23:46.460675+05:30
2	2	\N	2024-01-04	31	t	t	\N	Addition, Subtraction	Geometry	Simple words	Comprehension	t	\N	Adequate material ready	Matched	83	Partial Upto Date	Sufficient	3	2	4	5	4	2	3	4	t	t	f	t	t	t	f	26	t	t	t	f	t	\N	Excellent classroom environment.	2026-09-11 07:44:33.103104+05:30	2026-09-11 07:44:33.103105+05:30
3	2	\N	2024-02-16	13	t	f	Festival week	Multiplication	Decimals	Alphabets	Vocabulary	t	\N	Teacher well prepared	Not Matched	75	Upto Date	More than required	2	4	4	2	4	5	3	5	t	t	t	f	f	t	t	28	t	t	t	t	t	\N	Excellent classroom environment.	2026-09-11 07:44:33.103106+05:30	2026-09-11 07:44:33.103106+05:30
4	2	\N	2024-03-16	10	f	f	Weather disruption	Basic Numbers	Algebra basics	Alphabets	Essay writing	f	\N	Adequate material ready	Matched	43	Upto Date	More than required	2	2	5	2	3	3	5	3	t	f	t	t	t	t	t	30	t	f	t	t	f	\N	Overall good progress. Keep it up.	2026-09-11 07:44:33.103106+05:30	2026-09-11 07:44:33.103106+05:30
5	2	\N	2024-05-08	10	t	t	\N	Multiplication	Geometry	Alphabets	Grammar	t	\N	Good preparation	Matched	44	Upto Date	Lacking	2	3	4	5	3	3	5	3	f	f	t	t	t	t	f	9	t	f	t	t	f	\N	Academic performance is improving steadily.	2026-09-11 07:44:33.103107+05:30	2026-09-11 07:44:33.103107+05:30
6	2	\N	2024-06-17	16	f	t	Exam preparation	Multiplication	Decimals	Simple words	Essay writing	t	\N	Good preparation	Not Matched	91	Not Uptodate	Sufficient	2	2	2	3	3	5	5	5	t	t	t	t	f	t	f	17	t	f	f	t	f	\N	Students are engaged and motivated.	2026-09-11 07:44:33.103107+05:30	2026-09-11 07:44:33.103107+05:30
7	2	\N	2024-07-24	11	t	t	\N	Addition, Subtraction	Percentages	Alphabets	Grammar	t	\N	Some gaps in preparation	Matched	43	Not Uptodate	Sufficient	3	2	2	3	5	2	3	2	t	t	t	t	f	t	f	15	t	t	t	t	t	\N	Overall good progress. Keep it up.	2026-09-11 07:44:33.103107+05:30	2026-09-11 07:44:33.103107+05:30
8	2	\N	2024-09-04	13	t	f	Teacher absent	Multiplication	Percentages	Simple words	Essay writing	f	\N	Needs improvement in planning	Not Matched	58	Upto Date	Lacking	4	2	4	2	3	4	2	2	t	t	t	t	t	t	f	24	t	f	f	t	f	\N	Academic performance is improving steadily.	2026-09-11 07:44:33.103108+05:30	2026-09-11 07:44:33.103108+05:30
9	2	\N	2024-10-20	34	t	t	\N	Multiplication	Percentages	Simple words	Vocabulary	t	\N	Teacher well prepared	Matched	47	Upto Date	More than required	3	2	4	3	5	3	2	4	t	f	f	t	t	t	t	19	f	f	t	t	t	\N	Students are engaged and motivated.	2026-09-11 07:44:33.103108+05:30	2026-09-11 07:44:33.103108+05:30
10	2	\N	2024-11-26	35	f	f	Festival week	Basic Numbers	Algebra basics	Simple words	Essay writing	f	\N	Teacher well prepared	Matched	57	Upto Date	More than required	2	5	2	5	3	3	5	4	t	f	t	t	t	t	t	16	t	t	t	f	f	\N	Overall good progress. Keep it up.	2026-09-11 07:44:33.103108+05:30	2026-09-11 07:44:33.103108+05:30
11	2	\N	2025-01-19	15	t	f	Weather disruption	Addition, Subtraction	Algebra basics	Reading	Essay writing	t	\N	Adequate material ready	Not Matched	78	Not Uptodate	Sufficient	5	3	4	2	5	2	3	4	t	f	f	t	t	t	f	24	t	t	t	t	t	\N	Students are engaged and motivated.	2026-09-11 07:44:33.103109+05:30	2026-09-11 07:44:33.103109+05:30
12	2	\N	2025-02-13	31	t	f	Festival week	Fractions	Decimals	Alphabets	Essay writing	t	\N	Teacher well prepared	Not Matched	69	Partial Upto Date	Lacking	3	5	3	2	4	4	2	3	t	t	t	t	t	t	t	22	t	t	t	t	f	\N	Attendance needs improvement.	2026-09-11 07:44:33.103109+05:30	2026-09-11 07:44:33.103109+05:30
13	2	\N	2025-04-19	10	t	t	\N	Addition, Subtraction	Decimals	Simple words	Comprehension	f	\N	Some gaps in preparation	Not Matched	43	Not Uptodate	Sufficient	2	5	3	5	4	5	5	5	f	t	t	t	t	t	f	28	t	t	t	t	f	\N	Need to focus more on English reading.	2026-09-11 07:44:33.103109+05:30	2026-09-11 07:44:33.103109+05:30
14	2	\N	2025-05-22	14	f	t	Festival week	Basic Numbers	Geometry	Simple words	Grammar	t	\N	Adequate material ready	Not Matched	66	Upto Date	Sufficient	5	5	2	5	5	2	4	4	f	f	f	t	t	t	t	23	t	t	t	t	f	\N	Teacher dedication is commendable.	2026-09-11 07:44:33.10311+05:30	2026-09-11 07:44:33.10311+05:30
15	2	\N	2025-07-03	14	t	t	\N	Addition, Subtraction	Decimals	Alphabets	Grammar	t	\N	Needs improvement in planning	Not Matched	51	Upto Date	Lacking	5	4	3	5	4	4	5	4	f	f	t	t	t	t	f	15	t	f	t	f	t	\N	Students are engaged and motivated.	2026-09-11 07:44:33.10311+05:30	2026-09-11 07:44:33.10311+05:30
16	2	\N	2025-08-19	17	f	t	Festival week	Basic Numbers	Algebra basics	Simple words	Vocabulary	t	\N	Adequate material ready	Matched	78	Not Uptodate	More than required	2	3	4	2	2	4	5	5	f	t	t	f	t	t	f	29	t	t	f	f	f	\N	Excellent classroom environment.	2026-09-11 07:44:33.10311+05:30	2026-09-11 07:44:33.10311+05:30
17	2	\N	2025-10-02	26	t	t	\N	Fractions	Algebra basics	Reading	Vocabulary	t	\N	Adequate material ready	Not Matched	85	Upto Date	Lacking	3	4	5	5	5	4	4	3	f	t	f	t	t	t	f	18	t	f	t	t	f	\N	Need to focus more on English reading.	2026-09-11 07:44:33.103111+05:30	2026-09-11 07:44:33.103111+05:30
18	2	\N	2025-10-27	18	t	t	\N	Addition, Subtraction	Geometry	Alphabets	Comprehension	t	\N	Teacher well prepared	Matched	84	Partial Upto Date	More than required	5	5	2	2	4	3	5	3	t	t	t	t	t	t	f	19	t	t	t	t	t	\N	Need to focus more on English reading.	2026-09-11 07:44:33.103111+05:30	2026-09-11 07:44:33.103111+05:30
19	2	\N	2025-12-07	34	t	t	\N	Multiplication	Geometry	Simple words	Vocabulary	t	\N	Some gaps in preparation	Not Matched	46	Upto Date	Lacking	3	4	3	4	2	3	4	2	f	t	t	t	f	t	t	26	t	t	t	f	f	\N	Academic performance is improving steadily.	2026-09-11 07:44:33.103111+05:30	2026-09-11 07:44:33.103111+05:30
20	2	\N	2026-01-15	22	t	f	Exam preparation	Addition, Subtraction	Algebra basics	Simple words	Comprehension	f	\N	Adequate material ready	Matched	55	Upto Date	More than required	5	3	5	5	5	4	5	4	t	t	f	t	f	t	f	29	t	t	t	t	f	\N	Attendance needs improvement.	2026-09-11 07:44:33.103112+05:30	2026-09-11 07:44:33.103112+05:30
21	2	\N	2026-02-27	11	t	t	\N	Multiplication	Percentages	Short sentences	Vocabulary	t	\N	Needs improvement in planning	Not Matched	90	Not Uptodate	More than required	3	5	2	3	3	4	3	2	t	f	t	f	f	t	f	30	t	t	t	t	f	\N	Overall good progress. Keep it up.	2026-09-11 07:44:33.103112+05:30	2026-09-11 07:44:33.103112+05:30
22	2	\N	2026-04-20	33	t	f	Weather disruption	Fractions	Algebra basics	Alphabets	Comprehension	f	\N	Some gaps in preparation	Matched	88	Not Uptodate	Lacking	2	3	5	5	4	3	5	5	f	t	t	t	t	t	f	30	t	t	t	f	t	\N	Attendance needs improvement.	2026-09-11 07:44:33.103112+05:30	2026-09-11 07:44:33.103112+05:30
23	2	\N	2026-06-20	13	t	t	\N	Basic Numbers	Algebra basics	Reading	Vocabulary	t	\N	Some gaps in preparation	Not Matched	79	Partial Upto Date	More than required	5	2	3	4	3	4	5	5	t	f	t	t	t	t	f	10	t	f	t	f	t	\N	Attendance needs improvement.	2026-09-11 07:44:33.103113+05:30	2026-09-11 07:44:33.103113+05:30
24	2	\N	2026-07-21	32	f	t	Weather disruption	Basic Numbers	Decimals	Reading	Comprehension	t	\N	Needs improvement in planning	Not Matched	52	Not Uptodate	More than required	3	2	4	5	4	4	2	4	t	f	t	t	f	t	f	19	t	f	t	f	t	\N	Teacher dedication is commendable.	2026-09-11 07:44:33.103113+05:30	2026-09-11 07:44:33.103113+05:30
25	2	\N	2026-09-11	34	t	t	\N	Basic Numbers	Algebra basics	Short sentences	Vocabulary	t	\N	Teacher well prepared	Not Matched	82	Not Uptodate	Sufficient	5	2	3	4	2	5	2	5	t	t	f	f	t	f	f	18	t	t	t	t	f	\N	Need to focus more on English reading.	2026-09-11 07:44:33.103113+05:30	2026-09-11 07:44:33.103113+05:30
26	3	\N	2024-01-11	28	t	f	Weather disruption	Basic Numbers	Percentages	Reading	Essay writing	t	\N	Teacher well prepared	Not Matched	46	Upto Date	Lacking	4	4	4	2	5	4	2	2	f	t	f	f	f	t	f	15	t	t	t	t	t	\N	Teacher dedication is commendable.	2026-09-11 07:44:33.103114+05:30	2026-09-11 07:44:33.103114+05:30
27	3	\N	2024-02-27	11	t	t	\N	Fractions	Decimals	Alphabets	Essay writing	t	\N	Good preparation	Not Matched	60	Not Uptodate	Lacking	3	3	3	4	4	3	4	5	f	t	f	f	t	t	t	29	t	f	f	f	f	\N	Overall good progress. Keep it up.	2026-09-11 07:44:33.103114+05:30	2026-09-11 07:44:33.103114+05:30
28	3	\N	2024-04-05	27	f	t	Teacher absent	Basic Numbers	Percentages	Short sentences	Vocabulary	f	\N	Adequate material ready	Matched	83	Upto Date	Lacking	2	4	3	2	5	4	5	2	t	f	t	t	t	f	t	20	t	t	t	f	f	\N	Excellent classroom environment.	2026-09-11 07:44:33.103114+05:30	2026-09-11 07:44:33.103114+05:30
29	3	\N	2024-04-30	23	t	t	\N	Addition, Subtraction	Decimals	Reading	Essay writing	t	\N	Adequate material ready	Matched	68	Partial Upto Date	Sufficient	4	2	4	4	2	5	4	3	f	f	f	t	t	t	t	9	f	t	t	t	t	\N	Academic performance is improving steadily.	2026-09-11 07:44:33.103115+05:30	2026-09-11 07:44:33.103115+05:30
30	3	\N	2024-06-13	16	f	t	Festival week	Fractions	Geometry	Alphabets	Essay writing	f	\N	Needs improvement in planning	Matched	74	Partial Upto Date	Sufficient	2	2	3	2	4	3	4	2	t	t	t	t	t	t	f	24	t	t	t	t	f	\N	Attendance needs improvement.	2026-09-11 07:44:33.103115+05:30	2026-09-11 07:44:33.103115+05:30
31	3	\N	2024-07-26	25	t	t	\N	Basic Numbers	Decimals	Alphabets	Vocabulary	t	\N	Teacher well prepared	Matched	97	Upto Date	Lacking	3	2	3	4	4	5	4	5	t	t	f	t	t	f	t	21	t	t	t	t	f	\N	Teacher dedication is commendable.	2026-09-11 07:44:33.103115+05:30	2026-09-11 07:44:33.103115+05:30
32	3	\N	2024-09-09	31	t	t	\N	Fractions	Percentages	Simple words	Vocabulary	t	\N	Good preparation	Matched	67	Upto Date	More than required	4	3	2	4	2	5	4	5	f	t	f	t	t	t	t	12	t	t	t	f	f	\N	Overall good progress. Keep it up.	2026-09-11 07:44:33.103115+05:30	2026-09-11 07:44:33.103116+05:30
33	3	\N	2024-10-11	35	f	t	Exam preparation	Addition, Subtraction	Percentages	Alphabets	Comprehension	t	\N	Adequate material ready	Not Matched	62	Upto Date	Sufficient	3	5	2	3	2	2	3	5	t	t	t	t	f	t	t	9	t	f	t	t	f	\N	Teacher dedication is commendable.	2026-09-11 07:44:33.103116+05:30	2026-09-11 07:44:33.103116+05:30
34	3	\N	2024-11-15	23	t	t	\N	Fractions	Geometry	Alphabets	Essay writing	t	\N	Adequate material ready	Not Matched	73	Not Uptodate	Lacking	2	3	5	2	2	3	4	3	f	f	t	t	t	t	t	20	t	t	t	t	f	\N	Overall good progress. Keep it up.	2026-09-11 07:44:33.103116+05:30	2026-09-11 07:44:33.103116+05:30
35	3	\N	2024-12-12	23	t	t	\N	Addition, Subtraction	Decimals	Alphabets	Essay writing	t	\N	Some gaps in preparation	Not Matched	85	Not Uptodate	Lacking	4	2	5	2	4	3	5	4	t	f	t	t	t	t	f	18	t	f	t	t	t	\N	Academic performance is improving steadily.	2026-09-11 07:44:33.103116+05:30	2026-09-11 07:44:33.103117+05:30
36	3	\N	2025-01-26	30	t	t	\N	Multiplication	Geometry	Alphabets	Comprehension	t	\N	Needs improvement in planning	Matched	88	Not Uptodate	Sufficient	3	5	5	5	4	4	3	5	t	t	t	t	t	t	f	22	t	t	f	t	t	\N	Excellent classroom environment.	2026-09-11 07:44:33.103117+05:30	2026-09-11 07:44:33.103117+05:30
37	3	\N	2025-03-21	28	t	t	\N	Addition, Subtraction	Decimals	Simple words	Essay writing	t	\N	Some gaps in preparation	Matched	43	Partial Upto Date	Sufficient	4	2	3	2	3	5	5	3	t	f	t	f	t	t	f	10	t	t	t	t	t	\N	Need to focus more on English reading.	2026-09-11 07:44:33.103117+05:30	2026-09-11 07:44:33.103117+05:30
38	3	\N	2025-05-08	21	t	t	\N	Fractions	Decimals	Simple words	Grammar	t	\N	Teacher well prepared	Not Matched	92	Upto Date	More than required	2	5	4	2	4	4	3	3	t	f	t	f	t	t	t	24	f	f	f	t	f	\N	Academic performance is improving steadily.	2026-09-11 07:44:33.103117+05:30	2026-09-11 07:44:33.103118+05:30
39	3	\N	2025-06-10	14	t	t	\N	Multiplication	Geometry	Simple words	Vocabulary	t	\N	Adequate material ready	Matched	68	Not Uptodate	Lacking	5	3	3	4	5	3	4	5	t	t	t	t	f	f	t	16	t	t	t	f	t	\N	Need to focus more on English reading.	2026-09-11 07:44:33.103118+05:30	2026-09-11 07:44:33.103118+05:30
40	3	\N	2025-08-08	24	t	t	\N	Multiplication	Decimals	Alphabets	Comprehension	f	\N	Adequate material ready	Matched	66	Upto Date	Lacking	4	3	5	2	4	3	2	4	f	f	t	f	t	t	f	30	f	f	t	t	t	\N	Overall good progress. Keep it up.	2026-09-11 07:44:33.103118+05:30	2026-09-11 07:44:33.103118+05:30
41	3	\N	2025-09-04	27	t	f	Exam preparation	Addition, Subtraction	Percentages	Simple words	Essay writing	t	\N	Needs improvement in planning	Not Matched	80	Not Uptodate	Lacking	2	2	5	2	3	3	4	5	t	t	t	t	t	t	f	10	f	t	f	t	t	\N	Attendance needs improvement.	2026-09-11 07:44:33.103118+05:30	2026-09-11 07:44:33.103118+05:30
42	3	\N	2025-10-11	22	f	t	Weather disruption	Fractions	Algebra basics	Short sentences	Grammar	t	\N	Good preparation	Not Matched	48	Upto Date	Lacking	4	3	5	5	3	3	2	5	t	t	f	f	t	t	f	25	t	t	t	t	t	\N	Academic performance is improving steadily.	2026-09-11 07:44:33.103119+05:30	2026-09-11 07:44:33.103119+05:30
43	3	\N	2025-12-14	35	t	t	\N	Fractions	Decimals	Reading	Vocabulary	f	\N	Teacher well prepared	Not Matched	51	Partial Upto Date	More than required	5	4	4	2	5	2	5	3	t	t	t	t	t	t	f	13	t	t	t	f	f	\N	Excellent classroom environment.	2026-09-11 07:44:33.103119+05:30	2026-09-11 07:44:33.103119+05:30
44	3	\N	2026-01-21	35	f	t	Teacher absent	Addition, Subtraction	Decimals	Short sentences	Comprehension	f	\N	Needs improvement in planning	Not Matched	42	Upto Date	Sufficient	3	4	4	5	2	3	5	4	t	f	t	t	t	t	t	11	t	t	t	f	t	\N	Need to focus more on English reading.	2026-09-11 07:44:33.103119+05:30	2026-09-11 07:44:33.10312+05:30
45	3	\N	2026-02-21	16	f	t	Weather disruption	Basic Numbers	Geometry	Alphabets	Comprehension	f	\N	Teacher well prepared	Matched	97	Not Uptodate	Lacking	2	4	4	2	4	4	3	3	f	t	t	t	t	f	t	19	t	t	f	t	t	\N	Overall good progress. Keep it up.	2026-09-11 07:44:33.10312+05:30	2026-09-11 07:44:33.10312+05:30
46	3	\N	2026-04-24	33	t	f	Exam preparation	Basic Numbers	Decimals	Alphabets	Comprehension	f	\N	Good preparation	Not Matched	69	Not Uptodate	More than required	4	3	3	3	5	2	2	3	t	t	f	t	f	t	f	10	t	t	t	t	f	\N	Excellent classroom environment.	2026-09-11 07:44:33.10312+05:30	2026-09-11 07:44:33.10312+05:30
47	3	\N	2026-05-31	15	t	t	\N	Multiplication	Geometry	Short sentences	Grammar	f	\N	Good preparation	Matched	42	Not Uptodate	More than required	4	3	5	2	5	4	4	5	t	f	t	t	t	t	f	23	t	t	t	f	f	\N	Teacher dedication is commendable.	2026-09-11 07:44:33.10312+05:30	2026-09-11 07:44:33.103121+05:30
48	3	\N	2026-06-29	22	f	t	Festival week	Fractions	Algebra basics	Short sentences	Comprehension	t	\N	Adequate material ready	Not Matched	55	Upto Date	Sufficient	2	4	5	5	3	3	4	4	t	t	f	t	f	t	t	20	t	f	t	t	t	\N	Need to focus more on English reading.	2026-09-11 07:44:33.103121+05:30	2026-09-11 07:44:33.103121+05:30
49	3	\N	2026-08-26	30	t	f	Exam preparation	Fractions	Algebra basics	Alphabets	Vocabulary	t	\N	Adequate material ready	Not Matched	88	Partial Upto Date	Lacking	2	5	2	3	4	4	2	5	t	f	t	f	t	t	t	20	t	f	t	t	t	\N	Students are engaged and motivated.	2026-09-11 07:44:33.103121+05:30	2026-09-11 07:44:33.103121+05:30
50	4	\N	2024-01-10	23	t	t	\N	Multiplication	Decimals	Simple words	Vocabulary	t	\N	Some gaps in preparation	Not Matched	95	Not Uptodate	More than required	2	3	3	4	5	5	4	3	t	t	t	t	f	t	f	27	t	f	t	t	f	\N	Academic performance is improving steadily.	2026-09-11 07:44:33.103121+05:30	2026-09-11 07:44:33.103122+05:30
51	4	\N	2024-02-23	32	t	t	\N	Basic Numbers	Percentages	Reading	Essay writing	t	\N	Adequate material ready	Not Matched	47	Not Uptodate	More than required	5	5	4	3	4	2	4	2	t	t	t	t	t	t	f	12	t	t	t	t	t	\N	Teacher dedication is commendable.	2026-09-11 07:44:33.103122+05:30	2026-09-11 07:44:33.103122+05:30
52	4	\N	2024-03-15	20	t	t	\N	Basic Numbers	Algebra basics	Simple words	Grammar	f	\N	Needs improvement in planning	Not Matched	81	Partial Upto Date	Lacking	3	4	4	4	2	2	3	2	f	t	f	t	f	f	f	23	t	t	f	t	t	\N	Overall good progress. Keep it up.	2026-09-11 07:44:33.103122+05:30	2026-09-11 07:44:33.103122+05:30
53	4	\N	2024-04-23	20	t	t	\N	Fractions	Decimals	Reading	Comprehension	f	\N	Teacher well prepared	Not Matched	52	Upto Date	Lacking	3	5	4	3	2	4	4	3	t	f	f	f	t	t	t	13	f	t	f	t	f	\N	Students are engaged and motivated.	2026-09-11 07:44:33.103122+05:30	2026-09-11 07:44:33.103123+05:30
54	4	\N	2024-06-18	20	t	t	\N	Fractions	Algebra basics	Short sentences	Essay writing	t	\N	Good preparation	Matched	69	Partial Upto Date	Sufficient	5	4	2	4	4	3	3	3	t	t	f	t	t	f	t	15	t	t	f	t	f	\N	Overall good progress. Keep it up.	2026-09-11 07:44:33.103123+05:30	2026-09-11 07:44:33.103123+05:30
55	4	\N	2024-07-26	27	f	t	Festival week	Multiplication	Geometry	Short sentences	Vocabulary	t	\N	Needs improvement in planning	Not Matched	45	Not Uptodate	Lacking	2	5	3	5	5	2	5	4	t	t	f	t	t	t	f	30	t	f	f	t	f	\N	Overall good progress. Keep it up.	2026-09-11 07:44:33.103123+05:30	2026-09-11 07:44:33.103123+05:30
56	4	\N	2024-09-09	14	t	t	\N	Basic Numbers	Percentages	Reading	Vocabulary	f	\N	Teacher well prepared	Not Matched	45	Not Uptodate	More than required	3	4	2	3	5	3	3	2	f	f	t	t	t	t	t	15	t	t	t	f	t	\N	Overall good progress. Keep it up.	2026-09-11 07:44:33.103123+05:30	2026-09-11 07:44:33.103123+05:30
57	4	\N	2024-10-19	34	f	t	Teacher absent	Multiplication	Geometry	Alphabets	Grammar	t	\N	Teacher well prepared	Matched	55	Not Uptodate	Sufficient	5	5	3	3	2	3	4	3	f	t	t	t	t	t	f	12	f	t	t	t	t	\N	Teacher dedication is commendable.	2026-09-11 07:44:33.103124+05:30	2026-09-11 07:44:33.103124+05:30
58	4	\N	2024-12-19	11	t	t	\N	Fractions	Decimals	Short sentences	Vocabulary	t	\N	Adequate material ready	Not Matched	51	Not Uptodate	Lacking	3	3	4	3	5	2	5	5	t	t	t	t	t	f	f	10	t	f	t	t	t	\N	Academic performance is improving steadily.	2026-09-11 07:44:33.103124+05:30	2026-09-11 07:44:33.103124+05:30
59	4	\N	2025-01-31	28	t	f	Festival week	Basic Numbers	Geometry	Short sentences	Essay writing	f	\N	Good preparation	Matched	99	Upto Date	More than required	2	5	3	3	5	3	4	4	t	t	t	t	t	t	t	23	f	t	t	t	t	\N	Excellent classroom environment.	2026-09-11 07:44:33.103124+05:30	2026-09-11 07:44:33.103124+05:30
60	4	\N	2025-03-15	10	f	t	Weather disruption	Basic Numbers	Percentages	Simple words	Comprehension	t	\N	Teacher well prepared	Matched	71	Not Uptodate	More than required	4	4	5	5	5	3	4	3	t	t	t	f	f	f	t	10	f	t	f	t	t	\N	Overall good progress. Keep it up.	2026-09-11 07:44:33.103125+05:30	2026-09-11 07:44:33.103125+05:30
61	4	\N	2025-05-06	26	t	t	\N	Basic Numbers	Percentages	Alphabets	Vocabulary	t	\N	Good preparation	Matched	74	Not Uptodate	Lacking	2	2	4	4	2	5	3	2	f	t	t	t	t	t	f	10	t	t	t	f	t	\N	Need to focus more on English reading.	2026-09-11 07:44:33.103125+05:30	2026-09-11 07:44:33.103125+05:30
62	4	\N	2025-06-16	30	t	f	Teacher absent	Addition, Subtraction	Decimals	Reading	Vocabulary	t	\N	Good preparation	Matched	84	Upto Date	Sufficient	5	5	4	2	2	3	3	5	t	f	t	t	t	t	t	18	t	t	t	f	f	\N	Overall good progress. Keep it up.	2026-09-11 07:44:33.103125+05:30	2026-09-11 07:44:33.103125+05:30
63	4	\N	2025-07-17	28	t	t	\N	Basic Numbers	Percentages	Reading	Comprehension	f	\N	Good preparation	Not Matched	43	Upto Date	Lacking	3	2	4	5	4	2	4	5	t	t	f	t	t	t	t	27	t	t	t	t	f	\N	Teacher dedication is commendable.	2026-09-11 07:44:33.103125+05:30	2026-09-11 07:44:33.103126+05:30
64	4	\N	2025-08-23	22	f	t	Weather disruption	Fractions	Algebra basics	Alphabets	Grammar	f	\N	Teacher well prepared	Not Matched	88	Partial Upto Date	Sufficient	3	2	3	5	5	5	2	2	t	t	t	f	f	t	f	20	f	t	t	f	t	\N	Excellent classroom environment.	2026-09-11 07:44:33.103126+05:30	2026-09-11 07:44:33.103126+05:30
65	4	\N	2025-10-25	15	t	t	\N	Multiplication	Percentages	Short sentences	Essay writing	t	\N	Good preparation	Matched	67	Partial Upto Date	Lacking	4	5	2	4	4	3	5	3	t	t	t	t	f	t	f	22	t	f	f	f	t	\N	Need to focus more on English reading.	2026-09-11 07:44:33.103126+05:30	2026-09-11 07:44:33.103126+05:30
66	4	\N	2025-12-10	16	t	f	Exam preparation	Fractions	Geometry	Reading	Essay writing	t	\N	Teacher well prepared	Matched	60	Partial Upto Date	Lacking	5	4	2	3	3	2	5	3	t	t	t	f	f	t	f	12	t	t	t	t	f	\N	Overall good progress. Keep it up.	2026-09-11 07:44:33.103126+05:30	2026-09-11 07:44:33.103127+05:30
67	4	\N	2026-01-13	28	t	t	\N	Basic Numbers	Decimals	Alphabets	Essay writing	t	\N	Some gaps in preparation	Matched	46	Upto Date	More than required	4	3	2	5	4	5	2	2	t	t	t	t	t	t	f	20	t	t	t	t	t	\N	Attendance needs improvement.	2026-09-11 07:44:33.103127+05:30	2026-09-11 07:44:33.103127+05:30
68	4	\N	2026-02-21	12	t	t	\N	Addition, Subtraction	Geometry	Short sentences	Essay writing	t	\N	Needs improvement in planning	Not Matched	62	Partial Upto Date	Sufficient	5	5	4	2	4	2	2	2	f	t	t	t	f	t	t	25	t	t	f	t	f	\N	Teacher dedication is commendable.	2026-09-11 07:44:33.103127+05:30	2026-09-11 07:44:33.103127+05:30
69	4	\N	2026-03-28	23	t	t	\N	Basic Numbers	Algebra basics	Simple words	Vocabulary	t	\N	Teacher well prepared	Matched	85	Upto Date	Sufficient	4	2	2	3	4	4	3	5	t	t	t	f	t	t	f	26	t	t	t	t	f	\N	Excellent classroom environment.	2026-09-11 07:44:33.103127+05:30	2026-09-11 07:44:33.103127+05:30
70	4	\N	2026-05-21	20	t	t	\N	Addition, Subtraction	Geometry	Short sentences	Grammar	t	\N	Needs improvement in planning	Not Matched	66	Not Uptodate	Sufficient	5	5	3	5	3	3	5	4	t	t	t	t	t	t	t	14	f	f	t	t	f	\N	Attendance needs improvement.	2026-09-11 07:44:33.103128+05:30	2026-09-11 07:44:33.103128+05:30
71	4	\N	2026-07-06	15	t	t	\N	Addition, Subtraction	Algebra basics	Simple words	Essay writing	t	\N	Needs improvement in planning	Not Matched	50	Partial Upto Date	More than required	5	2	2	4	4	2	5	3	f	t	f	f	t	f	f	16	t	f	t	f	t	\N	Students are engaged and motivated.	2026-09-11 07:44:33.103128+05:30	2026-09-11 07:44:33.103128+05:30
72	4	\N	2026-08-14	21	f	t	Exam preparation	Multiplication	Geometry	Simple words	Comprehension	f	\N	Some gaps in preparation	Not Matched	74	Partial Upto Date	More than required	3	4	4	4	4	2	3	5	f	f	f	t	f	t	f	15	f	t	t	t	f	\N	Teacher dedication is commendable.	2026-09-11 07:44:33.103128+05:30	2026-09-11 07:44:33.103128+05:30
73	5	\N	2024-01-04	30	f	f	Weather disruption	Multiplication	Percentages	Alphabets	Essay writing	t	\N	Adequate material ready	Matched	43	Partial Upto Date	More than required	4	3	5	2	2	2	3	5	t	t	t	t	t	t	t	21	t	t	t	t	t	\N	Overall good progress. Keep it up.	2026-09-11 07:44:33.103129+05:30	2026-09-11 07:44:33.103129+05:30
74	5	\N	2024-02-21	14	t	f	Exam preparation	Multiplication	Geometry	Alphabets	Grammar	t	\N	Needs improvement in planning	Not Matched	62	Not Uptodate	Sufficient	3	5	5	3	2	2	3	2	t	t	f	t	t	t	t	15	t	t	t	f	t	\N	Academic performance is improving steadily.	2026-09-11 07:44:33.103129+05:30	2026-09-11 07:44:33.103129+05:30
75	5	\N	2024-04-04	16	f	f	Festival week	Basic Numbers	Percentages	Alphabets	Comprehension	t	\N	Good preparation	Matched	71	Not Uptodate	More than required	2	2	4	4	3	5	5	4	t	t	t	f	t	t	t	16	t	f	f	t	f	\N	Teacher dedication is commendable.	2026-09-11 07:44:33.103129+05:30	2026-09-11 07:44:33.103129+05:30
76	5	\N	2024-05-03	23	t	f	Exam preparation	Addition, Subtraction	Geometry	Short sentences	Grammar	t	\N	Some gaps in preparation	Matched	91	Upto Date	More than required	4	5	2	4	5	3	2	3	t	t	t	t	t	t	t	11	t	t	t	t	f	\N	Excellent classroom environment.	2026-09-11 07:44:33.10313+05:30	2026-09-11 07:44:33.10313+05:30
77	5	\N	2024-06-14	18	t	f	Festival week	Fractions	Geometry	Short sentences	Grammar	f	\N	Good preparation	Not Matched	91	Partial Upto Date	Lacking	2	4	2	5	5	4	2	5	f	t	t	f	f	t	t	15	t	t	f	t	t	\N	Attendance needs improvement.	2026-09-11 07:44:33.10313+05:30	2026-09-11 07:44:33.10313+05:30
78	5	\N	2024-08-06	15	t	f	Teacher absent	Basic Numbers	Geometry	Short sentences	Comprehension	t	\N	Adequate material ready	Not Matched	92	Upto Date	More than required	4	2	2	3	3	2	5	2	f	f	f	t	t	t	f	14	t	f	t	t	f	\N	Excellent classroom environment.	2026-09-11 07:44:33.10313+05:30	2026-09-11 07:44:33.10313+05:30
79	5	\N	2024-09-23	34	f	f	Festival week	Multiplication	Geometry	Alphabets	Vocabulary	t	\N	Some gaps in preparation	Not Matched	80	Not Uptodate	Sufficient	4	2	5	4	2	3	3	5	t	t	f	t	t	f	f	30	f	t	t	t	t	\N	Teacher dedication is commendable.	2026-09-11 07:44:33.10313+05:30	2026-09-11 07:44:33.103131+05:30
80	5	\N	2024-10-12	28	f	t	Teacher absent	Basic Numbers	Geometry	Simple words	Essay writing	t	\N	Adequate material ready	Not Matched	84	Not Uptodate	Lacking	4	5	4	3	2	3	3	2	t	t	t	t	t	f	t	22	t	t	t	t	f	\N	Academic performance is improving steadily.	2026-09-11 07:44:33.103131+05:30	2026-09-11 07:44:33.103131+05:30
81	5	\N	2024-12-18	16	t	t	\N	Fractions	Geometry	Alphabets	Comprehension	f	\N	Teacher well prepared	Matched	83	Partial Upto Date	Lacking	3	2	5	5	3	2	5	2	f	t	t	f	f	t	f	19	t	f	t	t	t	\N	Overall good progress. Keep it up.	2026-09-11 07:44:33.103131+05:30	2026-09-11 07:44:33.103131+05:30
82	5	\N	2025-01-15	30	f	t	Exam preparation	Multiplication	Algebra basics	Short sentences	Grammar	t	\N	Teacher well prepared	Matched	50	Not Uptodate	Lacking	5	5	2	5	5	3	4	3	f	t	t	t	t	t	f	23	t	t	t	t	t	\N	Attendance needs improvement.	2026-09-11 07:44:33.103131+05:30	2026-09-11 07:44:33.103132+05:30
83	5	\N	2025-03-07	26	t	f	Festival week	Addition, Subtraction	Decimals	Short sentences	Vocabulary	t	\N	Teacher well prepared	Not Matched	98	Not Uptodate	More than required	4	5	4	3	2	4	3	2	f	f	t	f	t	f	t	13	t	t	t	f	t	\N	Academic performance is improving steadily.	2026-09-11 07:44:33.103132+05:30	2026-09-11 07:44:33.103132+05:30
84	5	\N	2025-04-24	35	f	t	Exam preparation	Fractions	Geometry	Simple words	Comprehension	t	\N	Adequate material ready	Matched	85	Not Uptodate	Lacking	3	3	5	4	3	5	2	2	t	t	t	t	t	t	t	18	t	f	f	t	t	\N	Students are engaged and motivated.	2026-09-11 07:44:33.103132+05:30	2026-09-11 07:44:33.103132+05:30
85	5	\N	2025-06-15	34	t	f	Teacher absent	Fractions	Algebra basics	Short sentences	Vocabulary	t	\N	Adequate material ready	Not Matched	60	Upto Date	Sufficient	5	5	4	3	4	3	3	5	t	t	t	t	f	f	f	26	t	t	f	f	t	\N	Teacher dedication is commendable.	2026-09-11 07:44:33.103132+05:30	2026-09-11 07:44:33.103132+05:30
86	5	\N	2025-07-31	14	t	f	Weather disruption	Addition, Subtraction	Geometry	Short sentences	Essay writing	t	\N	Good preparation	Not Matched	68	Upto Date	Lacking	3	3	2	4	4	2	2	2	t	t	f	f	t	t	f	11	f	f	t	f	t	\N	Students are engaged and motivated.	2026-09-11 07:44:33.103133+05:30	2026-09-11 07:44:33.103133+05:30
87	5	\N	2025-09-22	11	t	f	Weather disruption	Addition, Subtraction	Percentages	Short sentences	Grammar	t	\N	Needs improvement in planning	Not Matched	50	Not Uptodate	Sufficient	2	4	5	2	5	3	5	3	t	t	f	t	t	f	f	29	t	t	t	t	f	\N	Students are engaged and motivated.	2026-09-11 07:44:33.103133+05:30	2026-09-11 07:44:33.103133+05:30
88	5	\N	2025-11-01	12	t	t	\N	Fractions	Decimals	Simple words	Grammar	t	\N	Needs improvement in planning	Not Matched	45	Partial Upto Date	Sufficient	4	5	5	5	4	2	5	3	t	t	t	t	t	t	f	26	t	f	t	t	f	\N	Academic performance is improving steadily.	2026-09-11 07:44:33.103133+05:30	2026-09-11 07:44:33.103133+05:30
89	5	\N	2025-12-13	28	t	f	Festival week	Addition, Subtraction	Decimals	Reading	Vocabulary	t	\N	Needs improvement in planning	Not Matched	59	Upto Date	Lacking	2	3	2	5	3	3	3	3	t	t	f	t	f	t	f	18	f	f	t	t	f	\N	Excellent classroom environment.	2026-09-11 07:44:33.103134+05:30	2026-09-11 07:44:33.103134+05:30
90	5	\N	2026-01-09	24	t	t	\N	Addition, Subtraction	Decimals	Alphabets	Vocabulary	t	\N	Some gaps in preparation	Matched	99	Upto Date	More than required	2	4	4	5	4	5	5	5	t	t	t	t	t	t	f	30	t	t	f	f	t	\N	Need to focus more on English reading.	2026-09-11 07:44:33.103134+05:30	2026-09-11 07:44:33.103134+05:30
91	5	\N	2026-03-07	18	f	t	Exam preparation	Addition, Subtraction	Geometry	Simple words	Essay writing	f	\N	Teacher well prepared	Not Matched	57	Not Uptodate	Lacking	2	3	5	3	5	5	4	2	t	t	t	t	t	f	t	13	t	f	f	t	f	\N	Overall good progress. Keep it up.	2026-09-11 07:44:33.103134+05:30	2026-09-11 07:44:33.103134+05:30
92	5	\N	2026-04-05	18	f	t	Weather disruption	Basic Numbers	Decimals	Alphabets	Grammar	t	\N	Teacher well prepared	Not Matched	51	Partial Upto Date	More than required	4	4	3	4	2	4	2	5	t	f	f	t	t	t	t	16	t	t	f	f	t	\N	Attendance needs improvement.	2026-09-11 07:44:33.103134+05:30	2026-09-11 07:44:33.103135+05:30
93	5	\N	2026-05-18	29	f	t	Teacher absent	Multiplication	Percentages	Short sentences	Essay writing	t	\N	Teacher well prepared	Not Matched	69	Partial Upto Date	Sufficient	5	4	5	2	2	4	4	4	t	t	t	t	t	t	f	14	t	f	f	f	f	\N	Teacher dedication is commendable.	2026-09-11 07:44:33.103135+05:30	2026-09-11 07:44:33.103135+05:30
94	5	\N	2026-07-15	10	t	t	\N	Basic Numbers	Percentages	Short sentences	Vocabulary	t	\N	Good preparation	Matched	61	Not Uptodate	More than required	3	5	4	4	3	3	4	2	t	t	t	t	f	f	f	28	t	t	t	t	f	\N	Need to focus more on English reading.	2026-09-11 07:44:33.103135+05:30	2026-09-11 07:44:33.103135+05:30
95	5	\N	2026-08-18	13	t	t	\N	Basic Numbers	Algebra basics	Alphabets	Vocabulary	f	\N	Some gaps in preparation	Matched	95	Not Uptodate	Lacking	4	5	2	3	3	3	4	5	f	f	f	t	f	t	t	23	t	f	t	t	f	\N	Need to focus more on English reading.	2026-09-11 07:44:33.103135+05:30	2026-09-11 07:44:33.103136+05:30
96	6	\N	2024-02-18	35	t	f	Exam preparation	Addition, Subtraction	Geometry	Simple words	Comprehension	t	\N	Good preparation	Matched	47	Partial Upto Date	More than required	2	5	4	2	2	2	2	2	t	t	t	t	t	t	t	17	t	t	t	t	t	\N	Attendance needs improvement.	2026-09-11 07:44:33.103136+05:30	2026-09-11 07:44:33.103136+05:30
97	6	\N	2024-03-26	33	f	t	Teacher absent	Fractions	Algebra basics	Alphabets	Vocabulary	t	\N	Needs improvement in planning	Not Matched	93	Not Uptodate	Sufficient	4	5	4	3	2	5	3	5	t	t	t	f	f	t	t	10	f	t	t	f	t	\N	Attendance needs improvement.	2026-09-11 07:44:33.103136+05:30	2026-09-11 07:44:33.103136+05:30
98	6	\N	2024-04-21	24	f	t	Teacher absent	Addition, Subtraction	Geometry	Alphabets	Essay writing	t	\N	Adequate material ready	Not Matched	87	Upto Date	Sufficient	2	2	3	3	4	4	5	4	f	t	f	t	t	f	f	20	t	t	t	f	t	\N	Overall good progress. Keep it up.	2026-09-11 07:44:33.103136+05:30	2026-09-11 07:44:33.103136+05:30
99	6	\N	2024-06-24	15	t	t	\N	Addition, Subtraction	Decimals	Reading	Vocabulary	t	\N	Teacher well prepared	Not Matched	79	Upto Date	More than required	3	5	5	2	5	5	2	2	t	t	t	t	f	t	t	29	f	t	t	t	f	\N	Teacher dedication is commendable.	2026-09-11 07:44:33.103137+05:30	2026-09-11 07:44:33.103137+05:30
100	6	\N	2024-08-03	31	t	t	\N	Basic Numbers	Geometry	Alphabets	Grammar	t	\N	Needs improvement in planning	Not Matched	94	Partial Upto Date	Sufficient	2	5	4	3	4	4	2	3	t	t	f	t	t	t	t	23	t	t	t	t	t	\N	Attendance needs improvement.	2026-09-11 07:44:33.103137+05:30	2026-09-11 07:44:33.103137+05:30
101	6	\N	2024-09-23	10	t	t	\N	Addition, Subtraction	Percentages	Simple words	Vocabulary	f	\N	Adequate material ready	Matched	92	Upto Date	Lacking	4	5	4	5	2	2	3	2	t	f	f	t	t	t	t	13	t	f	t	t	f	\N	Excellent classroom environment.	2026-09-11 07:44:33.103137+05:30	2026-09-11 07:44:33.103137+05:30
102	6	\N	2024-10-25	22	t	t	\N	Multiplication	Decimals	Simple words	Essay writing	t	\N	Teacher well prepared	Matched	99	Not Uptodate	More than required	2	5	5	3	5	2	2	5	f	t	t	f	t	t	t	11	t	t	f	t	f	\N	Attendance needs improvement.	2026-09-11 07:44:33.103138+05:30	2026-09-11 07:44:33.103138+05:30
103	6	\N	2024-12-17	34	f	f	Festival week	Fractions	Decimals	Short sentences	Essay writing	t	\N	Needs improvement in planning	Matched	66	Not Uptodate	More than required	4	4	3	3	3	4	4	3	f	t	f	t	t	t	t	19	t	t	f	t	f	\N	Academic performance is improving steadily.	2026-09-11 07:44:33.103138+05:30	2026-09-11 07:44:33.103138+05:30
104	6	\N	2025-01-21	13	t	t	\N	Addition, Subtraction	Decimals	Simple words	Grammar	t	\N	Needs improvement in planning	Not Matched	88	Upto Date	Lacking	4	3	2	4	3	2	4	5	t	f	t	f	t	t	t	24	f	f	t	t	f	\N	Attendance needs improvement.	2026-09-11 07:44:33.103138+05:30	2026-09-11 07:44:33.103138+05:30
105	6	\N	2025-02-24	31	t	f	Weather disruption	Addition, Subtraction	Algebra basics	Short sentences	Comprehension	t	\N	Teacher well prepared	Matched	98	Not Uptodate	More than required	4	3	3	4	5	3	2	3	f	t	t	t	t	t	t	26	f	t	t	f	t	\N	Students are engaged and motivated.	2026-09-11 07:44:33.103139+05:30	2026-09-11 07:44:33.103139+05:30
106	6	\N	2025-03-27	34	f	t	Weather disruption	Basic Numbers	Percentages	Alphabets	Essay writing	t	\N	Needs improvement in planning	Matched	90	Not Uptodate	Sufficient	5	5	2	4	3	3	4	4	t	t	f	t	f	f	t	11	t	t	f	t	t	\N	Overall good progress. Keep it up.	2026-09-11 07:44:33.103139+05:30	2026-09-11 07:44:33.103139+05:30
107	6	\N	2025-05-21	35	t	t	\N	Addition, Subtraction	Decimals	Short sentences	Essay writing	t	\N	Some gaps in preparation	Not Matched	72	Not Uptodate	Lacking	5	2	4	3	4	2	2	3	f	f	t	t	t	t	t	29	t	t	t	t	f	\N	Teacher dedication is commendable.	2026-09-11 07:44:33.103139+05:30	2026-09-11 07:44:33.103139+05:30
108	6	\N	2025-06-19	31	f	t	Festival week	Addition, Subtraction	Decimals	Short sentences	Grammar	t	\N	Good preparation	Matched	90	Partial Upto Date	More than required	2	3	4	5	5	5	5	5	t	t	t	t	t	t	t	30	f	t	t	t	f	\N	Excellent classroom environment.	2026-09-11 07:44:33.103139+05:30	2026-09-11 07:44:33.10314+05:30
109	6	\N	2025-08-06	24	t	f	Exam preparation	Basic Numbers	Algebra basics	Reading	Comprehension	t	\N	Needs improvement in planning	Not Matched	90	Not Uptodate	Lacking	3	4	4	2	3	2	2	2	t	t	t	t	t	t	f	14	t	t	t	t	t	\N	Excellent classroom environment.	2026-09-11 07:44:33.10314+05:30	2026-09-11 07:44:33.10314+05:30
110	6	\N	2025-09-08	15	f	t	Teacher absent	Basic Numbers	Algebra basics	Short sentences	Grammar	t	\N	Needs improvement in planning	Not Matched	100	Partial Upto Date	Lacking	3	3	2	4	2	3	4	5	t	t	t	t	t	t	f	21	t	t	f	t	f	\N	Need to focus more on English reading.	2026-09-11 07:44:33.10314+05:30	2026-09-11 07:44:33.10314+05:30
111	6	\N	2025-11-07	33	f	t	Weather disruption	Basic Numbers	Decimals	Reading	Essay writing	f	\N	Teacher well prepared	Matched	51	Not Uptodate	More than required	2	4	3	3	4	2	2	2	f	t	f	t	f	t	t	25	t	f	t	t	t	\N	Need to focus more on English reading.	2026-09-11 07:44:33.10314+05:30	2026-09-11 07:44:33.103141+05:30
112	6	\N	2025-12-10	28	t	f	Weather disruption	Multiplication	Decimals	Alphabets	Vocabulary	t	\N	Good preparation	Matched	94	Not Uptodate	More than required	3	3	5	3	3	3	5	4	t	f	t	t	t	t	f	20	t	t	t	f	f	\N	Overall good progress. Keep it up.	2026-09-11 07:44:33.103141+05:30	2026-09-11 07:44:33.103141+05:30
113	6	\N	2026-01-12	18	t	t	\N	Fractions	Geometry	Reading	Vocabulary	t	\N	Good preparation	Not Matched	64	Upto Date	More than required	5	4	4	5	5	2	3	5	t	t	t	t	t	t	t	29	t	f	t	t	f	\N	Attendance needs improvement.	2026-09-11 07:44:33.103141+05:30	2026-09-11 07:44:33.103141+05:30
114	6	\N	2026-03-05	23	t	t	\N	Addition, Subtraction	Geometry	Alphabets	Comprehension	t	\N	Needs improvement in planning	Matched	80	Not Uptodate	Sufficient	3	2	3	4	3	5	2	4	f	t	t	t	t	t	f	27	t	t	f	t	f	\N	Students are engaged and motivated.	2026-09-11 07:44:33.103141+05:30	2026-09-11 07:44:33.103141+05:30
115	6	\N	2026-04-30	24	t	t	\N	Addition, Subtraction	Geometry	Reading	Vocabulary	t	\N	Good preparation	Matched	73	Not Uptodate	More than required	5	3	2	3	5	2	2	2	t	t	t	f	f	f	f	24	t	f	t	t	f	\N	Academic performance is improving steadily.	2026-09-11 07:44:33.103142+05:30	2026-09-11 07:44:33.103142+05:30
116	6	\N	2026-06-11	35	f	t	Teacher absent	Basic Numbers	Geometry	Short sentences	Vocabulary	f	\N	Good preparation	Not Matched	78	Not Uptodate	Lacking	4	3	2	2	2	2	5	3	t	t	t	t	t	t	f	26	t	t	t	f	f	\N	Excellent classroom environment.	2026-09-11 07:44:33.103142+05:30	2026-09-11 07:44:33.103142+05:30
117	6	\N	2026-07-17	21	f	t	Exam preparation	Fractions	Percentages	Short sentences	Vocabulary	t	\N	Good preparation	Matched	68	Not Uptodate	Sufficient	2	3	5	4	2	3	5	2	f	f	t	t	t	t	f	10	t	t	f	t	f	\N	Teacher dedication is commendable.	2026-09-11 07:44:33.103142+05:30	2026-09-11 07:44:33.103142+05:30
118	6	\N	2026-09-06	34	f	t	Festival week	Basic Numbers	Decimals	Alphabets	Comprehension	f	\N	Some gaps in preparation	Not Matched	52	Upto Date	More than required	3	3	2	4	3	2	3	2	f	f	t	t	t	t	t	10	t	t	t	t	f	\N	Academic performance is improving steadily.	2026-09-11 07:44:33.103143+05:30	2026-09-11 07:44:33.103143+05:30
119	7	\N	2024-02-21	20	t	t	\N	Addition, Subtraction	Geometry	Reading	Essay writing	t	\N	Some gaps in preparation	Not Matched	51	Not Uptodate	More than required	3	5	3	3	3	4	3	3	t	t	t	t	t	f	f	27	t	f	f	f	f	\N	Excellent classroom environment.	2026-09-11 07:44:33.103143+05:30	2026-09-11 07:44:33.103143+05:30
120	7	\N	2024-03-28	28	t	f	Weather disruption	Basic Numbers	Geometry	Short sentences	Vocabulary	t	\N	Some gaps in preparation	Matched	43	Not Uptodate	Lacking	5	2	4	5	3	5	2	5	t	t	t	t	t	t	f	13	t	t	t	t	f	\N	Students are engaged and motivated.	2026-09-11 07:44:33.103143+05:30	2026-09-11 07:44:33.103143+05:30
121	7	\N	2024-05-18	32	t	t	\N	Fractions	Percentages	Reading	Essay writing	t	\N	Some gaps in preparation	Matched	76	Not Uptodate	Sufficient	2	4	3	5	5	3	3	3	t	t	t	t	f	t	f	23	t	t	t	t	t	\N	Overall good progress. Keep it up.	2026-09-11 07:44:33.103143+05:30	2026-09-11 07:44:33.103144+05:30
122	7	\N	2024-06-12	30	t	t	\N	Addition, Subtraction	Decimals	Short sentences	Essay writing	t	\N	Some gaps in preparation	Not Matched	62	Upto Date	Lacking	2	4	3	3	4	4	4	5	f	t	t	t	t	f	t	28	f	t	t	t	t	\N	Overall good progress. Keep it up.	2026-09-11 07:44:33.103144+05:30	2026-09-11 07:44:33.103144+05:30
123	7	\N	2024-07-27	20	t	t	\N	Fractions	Percentages	Reading	Essay writing	f	\N	Adequate material ready	Not Matched	66	Upto Date	Sufficient	2	3	3	4	2	3	3	5	t	t	f	t	t	t	t	11	t	t	t	f	f	\N	Students are engaged and motivated.	2026-09-11 07:44:33.103144+05:30	2026-09-11 07:44:33.103144+05:30
124	7	\N	2024-09-07	30	t	t	\N	Multiplication	Geometry	Simple words	Grammar	t	\N	Adequate material ready	Not Matched	95	Partial Upto Date	Lacking	4	5	3	3	5	5	4	4	t	t	t	t	t	t	t	8	t	f	t	t	t	\N	Teacher dedication is commendable.	2026-09-11 07:44:33.103144+05:30	2026-09-11 07:44:33.103145+05:30
125	7	\N	2024-10-13	25	f	f	Weather disruption	Addition, Subtraction	Decimals	Short sentences	Comprehension	f	\N	Some gaps in preparation	Not Matched	52	Partial Upto Date	More than required	5	5	3	3	5	5	3	4	t	t	t	f	t	t	f	17	t	t	t	t	t	\N	Students are engaged and motivated.	2026-09-11 07:44:33.103145+05:30	2026-09-11 07:44:33.103145+05:30
126	7	\N	2024-11-20	24	t	t	\N	Basic Numbers	Percentages	Reading	Comprehension	t	\N	Needs improvement in planning	Matched	74	Upto Date	Sufficient	2	4	4	3	5	2	3	2	t	t	t	t	f	f	f	30	f	t	f	f	t	\N	Need to focus more on English reading.	2026-09-11 07:44:33.103145+05:30	2026-09-11 07:44:33.103145+05:30
127	7	\N	2025-01-03	25	f	t	Festival week	Multiplication	Percentages	Reading	Grammar	t	\N	Needs improvement in planning	Not Matched	89	Partial Upto Date	Sufficient	2	3	5	2	3	5	5	4	f	t	t	t	t	t	f	28	t	t	t	t	t	\N	Students are engaged and motivated.	2026-09-11 07:44:33.103145+05:30	2026-09-11 07:44:33.103146+05:30
128	7	\N	2025-02-16	15	t	t	\N	Fractions	Algebra basics	Reading	Comprehension	t	\N	Good preparation	Not Matched	84	Not Uptodate	Sufficient	4	2	3	3	5	2	4	2	t	t	t	f	t	t	f	22	t	t	t	t	f	\N	Overall good progress. Keep it up.	2026-09-11 07:44:33.103146+05:30	2026-09-11 07:44:33.103146+05:30
129	7	\N	2025-03-28	19	t	t	\N	Basic Numbers	Geometry	Simple words	Essay writing	t	\N	Teacher well prepared	Not Matched	95	Not Uptodate	More than required	3	2	3	5	4	4	4	5	t	t	t	t	t	f	t	18	t	t	t	t	f	\N	Academic performance is improving steadily.	2026-09-11 07:44:33.103146+05:30	2026-09-11 07:44:33.103146+05:30
130	7	\N	2025-05-18	20	t	t	\N	Basic Numbers	Percentages	Alphabets	Grammar	t	\N	Good preparation	Matched	93	Upto Date	Sufficient	2	3	2	5	3	2	2	5	t	t	t	t	t	t	t	8	f	t	t	f	t	\N	Attendance needs improvement.	2026-09-11 07:44:33.103146+05:30	2026-09-11 07:44:33.103146+05:30
131	7	\N	2025-06-26	27	f	t	Exam preparation	Fractions	Algebra basics	Short sentences	Grammar	t	\N	Adequate material ready	Matched	100	Upto Date	More than required	2	2	3	5	3	3	3	3	t	t	t	f	t	t	f	11	t	t	t	t	t	\N	Excellent classroom environment.	2026-09-11 07:44:33.103147+05:30	2026-09-11 07:44:33.103147+05:30
132	7	\N	2025-08-17	21	f	t	Weather disruption	Fractions	Percentages	Reading	Vocabulary	f	\N	Adequate material ready	Matched	76	Not Uptodate	Sufficient	5	4	4	5	5	5	2	2	f	t	t	f	t	t	t	14	f	t	f	t	f	\N	Excellent classroom environment.	2026-09-11 07:44:33.103147+05:30	2026-09-11 07:44:33.103147+05:30
133	7	\N	2025-10-09	28	t	t	\N	Multiplication	Algebra basics	Alphabets	Vocabulary	t	\N	Needs improvement in planning	Not Matched	63	Not Uptodate	Sufficient	3	4	4	2	5	3	2	4	f	t	f	t	t	f	f	9	t	t	t	t	f	\N	Need to focus more on English reading.	2026-09-11 07:44:33.103147+05:30	2026-09-11 07:44:33.103147+05:30
134	7	\N	2025-11-10	13	f	t	Festival week	Addition, Subtraction	Decimals	Alphabets	Essay writing	t	\N	Adequate material ready	Matched	60	Not Uptodate	More than required	3	3	2	5	5	2	3	5	t	t	t	t	t	t	f	16	t	t	f	t	t	\N	Attendance needs improvement.	2026-09-11 07:44:33.103147+05:30	2026-09-11 07:44:33.103148+05:30
135	7	\N	2025-12-11	30	t	t	\N	Multiplication	Geometry	Simple words	Grammar	t	\N	Teacher well prepared	Not Matched	83	Not Uptodate	Sufficient	2	5	5	4	4	3	4	4	t	t	t	f	t	f	f	27	t	t	f	t	f	\N	Students are engaged and motivated.	2026-09-11 07:44:33.103148+05:30	2026-09-11 07:44:33.103148+05:30
136	7	\N	2026-01-21	13	f	f	Teacher absent	Multiplication	Geometry	Short sentences	Grammar	t	\N	Good preparation	Not Matched	68	Partial Upto Date	Sufficient	4	3	3	3	4	5	3	2	t	f	t	t	t	t	f	9	t	f	t	t	f	\N	Academic performance is improving steadily.	2026-09-11 07:44:33.103148+05:30	2026-09-11 07:44:33.103148+05:30
137	7	\N	2026-02-27	30	t	t	\N	Basic Numbers	Geometry	Reading	Grammar	f	\N	Teacher well prepared	Matched	51	Upto Date	More than required	5	2	2	3	4	4	5	5	t	t	t	t	t	f	f	9	t	f	f	f	t	\N	Excellent classroom environment.	2026-09-11 07:44:33.103148+05:30	2026-09-11 07:44:33.103148+05:30
138	7	\N	2026-04-19	20	f	t	Exam preparation	Multiplication	Algebra basics	Reading	Comprehension	t	\N	Some gaps in preparation	Matched	67	Partial Upto Date	More than required	4	5	3	3	3	3	3	4	t	f	f	t	f	f	t	18	t	t	t	t	t	\N	Teacher dedication is commendable.	2026-09-11 07:44:33.103149+05:30	2026-09-11 07:44:33.103149+05:30
139	7	\N	2026-06-07	23	t	t	\N	Basic Numbers	Percentages	Reading	Essay writing	t	\N	Needs improvement in planning	Matched	48	Upto Date	Sufficient	4	3	3	3	2	4	2	5	t	f	t	t	t	t	f	12	t	t	t	f	f	\N	Attendance needs improvement.	2026-09-11 07:44:33.103149+05:30	2026-09-11 07:44:33.103149+05:30
140	7	\N	2026-07-04	16	t	t	\N	Multiplication	Algebra basics	Simple words	Vocabulary	f	\N	Teacher well prepared	Not Matched	95	Partial Upto Date	Sufficient	5	5	2	5	4	5	2	2	t	f	t	f	t	t	t	25	t	f	f	t	f	\N	Attendance needs improvement.	2026-09-11 07:44:33.103149+05:30	2026-09-11 07:44:33.103149+05:30
141	7	\N	2026-08-16	19	f	f	Exam preparation	Multiplication	Decimals	Short sentences	Grammar	t	\N	Needs improvement in planning	Not Matched	93	Not Uptodate	Lacking	2	2	3	3	5	5	4	5	t	t	f	f	f	t	f	30	t	t	t	t	t	\N	Overall good progress. Keep it up.	2026-09-11 07:44:33.10315+05:30	2026-09-11 07:44:33.10315+05:30
142	8	\N	2024-01-05	16	t	t	\N	Addition, Subtraction	Geometry	Simple words	Grammar	t	\N	Good preparation	Matched	94	Upto Date	More than required	4	4	2	2	2	5	3	3	t	t	t	t	f	t	f	26	t	t	f	t	f	\N	Academic performance is improving steadily.	2026-09-11 07:44:33.10315+05:30	2026-09-11 07:44:33.10315+05:30
143	8	\N	2024-02-08	27	t	t	\N	Addition, Subtraction	Percentages	Reading	Comprehension	t	\N	Adequate material ready	Not Matched	73	Partial Upto Date	More than required	3	3	2	2	2	5	4	5	t	t	t	f	t	t	f	24	t	t	f	f	t	\N	Teacher dedication is commendable.	2026-09-11 07:44:33.10315+05:30	2026-09-11 07:44:33.10315+05:30
144	8	\N	2024-04-09	13	t	t	\N	Addition, Subtraction	Decimals	Alphabets	Comprehension	f	\N	Teacher well prepared	Not Matched	42	Partial Upto Date	Lacking	3	2	3	4	4	2	4	4	t	t	t	t	t	t	t	13	t	f	f	t	f	\N	Academic performance is improving steadily.	2026-09-11 07:44:33.10315+05:30	2026-09-11 07:44:33.103151+05:30
145	8	\N	2024-05-15	14	t	t	\N	Basic Numbers	Percentages	Reading	Vocabulary	f	\N	Good preparation	Not Matched	76	Not Uptodate	More than required	4	2	3	4	4	2	3	4	f	t	t	t	t	t	t	27	t	f	t	f	t	\N	Need to focus more on English reading.	2026-09-11 07:44:33.103151+05:30	2026-09-11 07:44:33.103151+05:30
146	8	\N	2024-06-20	17	t	t	\N	Fractions	Decimals	Short sentences	Comprehension	t	\N	Needs improvement in planning	Matched	63	Upto Date	Sufficient	2	5	2	5	3	3	4	5	t	t	f	t	f	f	t	14	t	t	t	t	t	\N	Need to focus more on English reading.	2026-09-11 07:44:33.103151+05:30	2026-09-11 07:44:33.103151+05:30
147	8	\N	2024-08-08	29	f	t	Teacher absent	Fractions	Decimals	Alphabets	Grammar	t	\N	Adequate material ready	Matched	76	Partial Upto Date	More than required	3	4	3	3	4	4	4	5	t	t	t	t	f	t	t	14	t	t	t	f	f	\N	Excellent classroom environment.	2026-09-11 07:44:33.103151+05:30	2026-09-11 07:44:33.103151+05:30
148	8	\N	2024-09-11	29	t	t	\N	Fractions	Decimals	Alphabets	Comprehension	t	\N	Good preparation	Matched	64	Upto Date	Sufficient	5	5	3	5	4	4	4	3	t	t	t	f	f	t	t	10	f	f	t	t	f	\N	Attendance needs improvement.	2026-09-11 07:44:33.103152+05:30	2026-09-11 07:44:33.103152+05:30
149	8	\N	2024-10-20	29	t	t	\N	Fractions	Percentages	Reading	Comprehension	t	\N	Adequate material ready	Not Matched	69	Partial Upto Date	Sufficient	2	5	2	4	5	5	3	4	f	t	t	t	f	f	f	25	t	f	t	t	f	\N	Students are engaged and motivated.	2026-09-11 07:44:33.103152+05:30	2026-09-11 07:44:33.103152+05:30
150	8	\N	2024-12-03	25	t	t	\N	Basic Numbers	Algebra basics	Short sentences	Comprehension	f	\N	Some gaps in preparation	Not Matched	90	Partial Upto Date	More than required	4	3	3	2	5	2	5	4	t	f	t	f	t	t	f	18	t	t	t	f	t	\N	Academic performance is improving steadily.	2026-09-11 07:44:33.103152+05:30	2026-09-11 07:44:33.103152+05:30
151	8	\N	2025-01-12	27	t	t	\N	Fractions	Decimals	Reading	Comprehension	t	\N	Adequate material ready	Not Matched	76	Not Uptodate	Lacking	5	4	2	2	5	3	4	2	t	t	t	t	f	t	f	8	t	t	t	t	f	\N	Attendance needs improvement.	2026-09-11 07:44:33.103153+05:30	2026-09-11 07:44:33.103153+05:30
152	8	\N	2025-03-02	31	t	t	\N	Multiplication	Decimals	Simple words	Comprehension	t	\N	Adequate material ready	Not Matched	49	Partial Upto Date	More than required	3	3	2	2	2	3	5	5	f	t	t	f	f	f	f	27	t	t	t	t	f	\N	Students are engaged and motivated.	2026-09-11 07:44:33.103153+05:30	2026-09-11 07:44:33.103153+05:30
153	8	\N	2025-04-05	28	t	t	\N	Basic Numbers	Geometry	Short sentences	Vocabulary	f	\N	Some gaps in preparation	Not Matched	42	Upto Date	More than required	5	4	2	5	2	3	4	5	t	t	t	t	t	t	t	29	t	f	t	t	f	\N	Excellent classroom environment.	2026-09-11 07:44:33.103153+05:30	2026-09-11 07:44:33.103153+05:30
154	8	\N	2025-05-17	26	f	t	Exam preparation	Fractions	Decimals	Short sentences	Essay writing	t	\N	Good preparation	Not Matched	86	Not Uptodate	Lacking	2	5	3	2	4	2	4	5	t	t	f	t	t	t	f	8	t	t	f	t	f	\N	Need to focus more on English reading.	2026-09-11 07:44:33.103153+05:30	2026-09-11 07:44:33.103154+05:30
155	8	\N	2025-07-04	32	f	t	Festival week	Basic Numbers	Geometry	Alphabets	Essay writing	f	\N	Needs improvement in planning	Matched	93	Partial Upto Date	Lacking	5	3	5	3	3	4	2	4	f	t	t	t	t	t	t	20	t	t	t	t	f	\N	Overall good progress. Keep it up.	2026-09-11 07:44:33.103154+05:30	2026-09-11 07:44:33.103154+05:30
156	8	\N	2025-07-28	22	t	f	Weather disruption	Addition, Subtraction	Algebra basics	Short sentences	Vocabulary	t	\N	Adequate material ready	Not Matched	57	Partial Upto Date	Sufficient	4	5	5	3	3	4	3	4	t	t	f	t	t	t	f	19	t	t	t	t	t	\N	Overall good progress. Keep it up.	2026-09-11 07:44:33.103154+05:30	2026-09-11 07:44:33.103154+05:30
157	8	\N	2025-09-30	16	f	t	Teacher absent	Addition, Subtraction	Algebra basics	Simple words	Vocabulary	t	\N	Some gaps in preparation	Matched	97	Upto Date	More than required	3	4	4	5	2	5	4	5	t	t	f	t	f	t	t	20	t	f	t	f	t	\N	Attendance needs improvement.	2026-09-11 07:44:33.103154+05:30	2026-09-11 07:44:33.103155+05:30
158	8	\N	2025-11-21	16	t	f	Exam preparation	Multiplication	Decimals	Alphabets	Comprehension	t	\N	Teacher well prepared	Matched	79	Not Uptodate	Sufficient	5	4	2	2	2	2	4	5	t	t	t	t	t	t	t	30	t	t	t	t	f	\N	Attendance needs improvement.	2026-09-11 07:44:33.103155+05:30	2026-09-11 07:44:33.103155+05:30
159	8	\N	2025-12-28	34	t	f	Teacher absent	Multiplication	Algebra basics	Reading	Vocabulary	t	\N	Some gaps in preparation	Not Matched	61	Not Uptodate	Lacking	5	2	2	4	4	2	5	4	t	t	t	t	t	t	t	28	t	t	f	t	t	\N	Students are engaged and motivated.	2026-09-11 07:44:33.103155+05:30	2026-09-11 07:44:33.103155+05:30
160	8	\N	2026-02-04	28	t	t	\N	Multiplication	Decimals	Reading	Grammar	f	\N	Adequate material ready	Not Matched	74	Partial Upto Date	Sufficient	2	4	2	4	2	5	2	3	f	t	t	t	f	t	t	10	t	t	t	t	t	\N	Students are engaged and motivated.	2026-09-11 07:44:33.103155+05:30	2026-09-11 07:44:33.103155+05:30
161	8	\N	2026-03-28	15	t	t	\N	Addition, Subtraction	Percentages	Alphabets	Vocabulary	t	\N	Some gaps in preparation	Matched	92	Upto Date	Sufficient	5	3	2	3	5	4	5	4	t	t	t	t	f	t	t	26	t	t	t	f	t	\N	Teacher dedication is commendable.	2026-09-11 07:44:33.103156+05:30	2026-09-11 07:44:33.103156+05:30
162	8	\N	2026-05-13	17	t	t	\N	Addition, Subtraction	Geometry	Alphabets	Vocabulary	f	\N	Good preparation	Not Matched	45	Upto Date	Sufficient	3	2	4	5	5	3	3	3	t	t	t	f	t	t	t	30	t	f	t	f	f	\N	Attendance needs improvement.	2026-09-11 07:44:33.103156+05:30	2026-09-11 07:44:33.103156+05:30
163	8	\N	2026-06-30	13	t	t	\N	Addition, Subtraction	Percentages	Simple words	Vocabulary	f	\N	Needs improvement in planning	Not Matched	43	Upto Date	Sufficient	3	5	5	3	3	2	2	4	t	t	t	f	f	t	t	25	t	f	t	t	t	\N	Teacher dedication is commendable.	2026-09-11 07:44:33.103156+05:30	2026-09-11 07:44:33.103156+05:30
164	8	\N	2026-08-11	23	t	t	\N	Multiplication	Percentages	Simple words	Grammar	t	\N	Good preparation	Matched	87	Partial Upto Date	Sufficient	5	3	2	5	5	2	5	3	t	t	t	t	t	t	f	16	t	t	t	t	t	\N	Overall good progress. Keep it up.	2026-09-11 07:44:33.103156+05:30	2026-09-11 07:44:33.103157+05:30
165	8	\N	2026-09-03	15	f	t	Weather disruption	Multiplication	Percentages	Simple words	Comprehension	t	\N	Some gaps in preparation	Matched	45	Partial Upto Date	More than required	5	3	5	5	4	2	5	3	t	t	t	f	f	f	t	21	f	t	t	f	t	\N	Attendance needs improvement.	2026-09-11 07:44:33.103157+05:30	2026-09-11 07:44:33.103157+05:30
166	9	\N	2024-01-07	21	f	t	Exam preparation	Addition, Subtraction	Percentages	Short sentences	Comprehension	t	\N	Good preparation	Matched	48	Partial Upto Date	Sufficient	2	5	3	3	4	4	4	5	t	t	t	t	t	t	f	22	t	f	f	f	t	\N	Students are engaged and motivated.	2026-09-11 07:44:33.103157+05:30	2026-09-11 07:44:33.103157+05:30
167	9	\N	2024-02-22	12	f	t	Exam preparation	Multiplication	Percentages	Alphabets	Grammar	t	\N	Good preparation	Matched	71	Upto Date	Sufficient	2	4	5	3	5	4	5	5	t	t	t	t	f	f	f	21	t	t	f	t	f	\N	Attendance needs improvement.	2026-09-11 07:44:33.103157+05:30	2026-09-11 07:44:33.103157+05:30
168	9	\N	2024-03-30	35	t	t	\N	Fractions	Geometry	Short sentences	Comprehension	t	\N	Adequate material ready	Matched	49	Partial Upto Date	Lacking	5	3	3	4	3	3	3	3	t	t	t	t	t	t	t	29	t	t	t	t	t	\N	Excellent classroom environment.	2026-09-11 07:44:33.103158+05:30	2026-09-11 07:44:33.103158+05:30
169	9	\N	2024-05-12	22	t	f	Exam preparation	Multiplication	Decimals	Short sentences	Comprehension	t	\N	Some gaps in preparation	Not Matched	81	Not Uptodate	Lacking	5	4	3	5	4	2	5	2	t	t	t	t	f	t	t	18	t	t	t	t	f	\N	Students are engaged and motivated.	2026-09-11 07:44:33.103159+05:30	2026-09-11 07:44:33.103159+05:30
170	9	\N	2024-06-28	24	t	t	\N	Addition, Subtraction	Decimals	Simple words	Vocabulary	t	\N	Some gaps in preparation	Matched	98	Not Uptodate	Lacking	5	3	5	4	5	4	2	4	t	t	t	t	t	f	f	22	t	f	f	t	f	\N	Students are engaged and motivated.	2026-09-11 07:44:33.103159+05:30	2026-09-11 07:44:33.103159+05:30
171	9	\N	2024-07-29	14	f	t	Festival week	Fractions	Decimals	Short sentences	Grammar	f	\N	Some gaps in preparation	Not Matched	45	Upto Date	Lacking	4	5	3	5	3	3	3	5	t	t	f	t	t	t	f	15	t	t	t	f	f	\N	Overall good progress. Keep it up.	2026-09-11 07:44:33.10316+05:30	2026-09-11 07:44:33.10316+05:30
172	9	\N	2024-08-30	23	t	f	Festival week	Basic Numbers	Geometry	Alphabets	Grammar	f	\N	Teacher well prepared	Matched	78	Not Uptodate	Lacking	5	5	4	5	2	4	2	4	t	t	t	f	t	t	f	19	t	f	t	t	t	\N	Excellent classroom environment.	2026-09-11 07:44:33.10316+05:30	2026-09-11 07:44:33.10316+05:30
173	9	\N	2024-10-20	34	t	t	\N	Addition, Subtraction	Geometry	Short sentences	Essay writing	f	\N	Adequate material ready	Not Matched	83	Not Uptodate	More than required	4	2	4	3	2	3	4	4	f	t	f	t	t	t	t	25	t	f	t	t	t	\N	Attendance needs improvement.	2026-09-11 07:44:33.10316+05:30	2026-09-11 07:44:33.10316+05:30
174	9	\N	2024-12-12	14	t	t	\N	Addition, Subtraction	Decimals	Short sentences	Essay writing	t	\N	Needs improvement in planning	Not Matched	96	Not Uptodate	More than required	4	3	4	2	2	3	3	3	t	t	t	f	t	f	t	10	t	t	t	t	t	\N	Academic performance is improving steadily.	2026-09-11 07:44:33.10316+05:30	2026-09-11 07:44:33.103161+05:30
175	9	\N	2024-12-29	25	t	t	\N	Addition, Subtraction	Percentages	Alphabets	Grammar	t	\N	Good preparation	Matched	90	Upto Date	More than required	3	3	3	4	2	2	3	4	f	t	t	t	t	t	t	11	f	f	t	t	f	\N	Students are engaged and motivated.	2026-09-11 07:44:33.103161+05:30	2026-09-11 07:44:33.103161+05:30
176	9	\N	2025-02-26	33	f	t	Teacher absent	Multiplication	Decimals	Short sentences	Comprehension	t	\N	Good preparation	Matched	93	Partial Upto Date	Lacking	5	3	3	5	2	4	2	5	t	t	f	t	t	t	f	23	t	t	t	t	f	\N	Students are engaged and motivated.	2026-09-11 07:44:33.103161+05:30	2026-09-11 07:44:33.103161+05:30
177	9	\N	2025-04-12	23	t	t	\N	Multiplication	Algebra basics	Reading	Essay writing	t	\N	Teacher well prepared	Matched	65	Partial Upto Date	More than required	2	2	3	5	5	2	3	2	t	t	t	f	t	t	f	23	t	t	t	t	f	\N	Need to focus more on English reading.	2026-09-11 07:44:33.103161+05:30	2026-09-11 07:44:33.103161+05:30
178	9	\N	2025-05-17	22	t	t	\N	Basic Numbers	Percentages	Simple words	Vocabulary	t	\N	Adequate material ready	Not Matched	71	Upto Date	More than required	3	2	2	2	2	5	2	3	t	t	t	t	t	t	f	22	t	t	t	t	f	\N	Academic performance is improving steadily.	2026-09-11 07:44:33.103162+05:30	2026-09-11 07:44:33.103162+05:30
179	9	\N	2025-06-25	34	f	t	Teacher absent	Basic Numbers	Algebra basics	Reading	Vocabulary	t	\N	Teacher well prepared	Not Matched	69	Upto Date	Sufficient	3	4	3	5	5	3	4	5	t	t	t	t	t	t	f	25	f	t	t	t	f	\N	Excellent classroom environment.	2026-09-11 07:44:33.103162+05:30	2026-09-11 07:44:33.103162+05:30
180	9	\N	2025-08-12	19	t	f	Weather disruption	Addition, Subtraction	Algebra basics	Alphabets	Comprehension	f	\N	Adequate material ready	Matched	88	Not Uptodate	Lacking	5	2	5	4	4	5	4	2	t	t	t	t	f	t	f	11	t	t	t	t	f	\N	Excellent classroom environment.	2026-09-11 07:44:33.103162+05:30	2026-09-11 07:44:33.103162+05:30
181	9	\N	2025-10-12	10	t	t	\N	Basic Numbers	Algebra basics	Short sentences	Vocabulary	t	\N	Adequate material ready	Matched	91	Partial Upto Date	Sufficient	3	4	5	4	3	4	4	5	t	t	f	t	f	t	f	9	t	t	f	t	t	\N	Teacher dedication is commendable.	2026-09-11 07:44:33.103163+05:30	2026-09-11 07:44:33.103163+05:30
182	9	\N	2025-11-30	20	f	t	Weather disruption	Addition, Subtraction	Decimals	Reading	Comprehension	t	\N	Good preparation	Not Matched	72	Partial Upto Date	Lacking	4	3	5	5	4	5	3	2	t	t	t	t	t	f	f	16	f	t	t	f	f	\N	Excellent classroom environment.	2026-09-11 07:44:33.103163+05:30	2026-09-11 07:44:33.103163+05:30
183	9	\N	2026-01-04	16	t	t	\N	Fractions	Decimals	Simple words	Comprehension	t	\N	Adequate material ready	Not Matched	66	Partial Upto Date	Sufficient	3	5	4	4	3	4	3	5	t	t	t	f	t	t	f	21	t	t	t	t	f	\N	Academic performance is improving steadily.	2026-09-11 07:44:33.103163+05:30	2026-09-11 07:44:33.103163+05:30
184	9	\N	2026-02-02	15	f	t	Teacher absent	Basic Numbers	Algebra basics	Alphabets	Grammar	t	\N	Adequate material ready	Matched	97	Partial Upto Date	Lacking	2	5	3	3	2	2	4	5	f	t	t	f	t	t	f	15	f	t	t	t	f	\N	Attendance needs improvement.	2026-09-11 07:44:33.103163+05:30	2026-09-11 07:44:33.103164+05:30
185	9	\N	2026-03-23	11	t	f	Exam preparation	Fractions	Algebra basics	Short sentences	Vocabulary	t	\N	Needs improvement in planning	Not Matched	96	Upto Date	Lacking	5	4	4	2	2	2	3	4	t	t	f	t	f	t	t	22	t	f	t	f	f	\N	Need to focus more on English reading.	2026-09-11 07:44:33.103164+05:30	2026-09-11 07:44:33.103164+05:30
186	9	\N	2026-04-21	17	t	f	Weather disruption	Multiplication	Geometry	Reading	Essay writing	f	\N	Teacher well prepared	Matched	57	Upto Date	Lacking	5	5	4	5	2	3	4	2	t	t	f	t	t	t	t	28	t	t	f	t	f	\N	Students are engaged and motivated.	2026-09-11 07:44:33.103164+05:30	2026-09-11 07:44:33.103164+05:30
187	9	\N	2026-06-07	12	t	t	\N	Addition, Subtraction	Geometry	Simple words	Comprehension	f	\N	Teacher well prepared	Not Matched	68	Partial Upto Date	More than required	3	4	3	4	4	3	2	5	t	t	t	f	t	t	t	25	t	t	f	f	t	\N	Need to focus more on English reading.	2026-09-11 07:44:33.103164+05:30	2026-09-11 07:44:33.103164+05:30
188	9	\N	2026-07-12	22	t	t	\N	Basic Numbers	Percentages	Simple words	Grammar	f	\N	Needs improvement in planning	Matched	40	Not Uptodate	More than required	5	5	5	2	3	3	3	4	t	t	t	f	t	f	f	29	t	t	f	t	f	\N	Students are engaged and motivated.	2026-09-11 07:44:33.103165+05:30	2026-09-11 07:44:33.103165+05:30
189	9	\N	2026-08-25	21	t	f	Exam preparation	Addition, Subtraction	Algebra basics	Reading	Comprehension	f	\N	Teacher well prepared	Matched	85	Partial Upto Date	More than required	5	4	2	2	2	2	4	3	t	t	t	t	f	t	t	8	t	t	t	t	f	\N	Students are engaged and motivated.	2026-09-11 07:44:33.103165+05:30	2026-09-11 07:44:33.103165+05:30
190	10	\N	2024-01-08	25	t	t	\N	Addition, Subtraction	Decimals	Short sentences	Vocabulary	t	\N	Good preparation	Matched	47	Partial Upto Date	Sufficient	3	4	3	3	4	3	2	3	t	t	f	t	f	t	t	20	t	f	t	t	t	\N	Overall good progress. Keep it up.	2026-09-11 07:44:33.103165+05:30	2026-09-11 07:44:33.103165+05:30
191	10	\N	2024-02-14	25	t	t	\N	Basic Numbers	Percentages	Alphabets	Essay writing	f	\N	Some gaps in preparation	Not Matched	60	Not Uptodate	More than required	3	3	2	4	4	2	2	5	t	t	t	f	t	t	t	13	t	t	t	f	t	\N	Overall good progress. Keep it up.	2026-09-11 07:44:33.103166+05:30	2026-09-11 07:44:33.103166+05:30
192	10	\N	2024-03-15	33	t	f	Weather disruption	Multiplication	Percentages	Alphabets	Essay writing	t	\N	Teacher well prepared	Not Matched	96	Partial Upto Date	Lacking	4	5	2	5	4	3	5	5	t	t	f	t	t	t	f	24	t	t	t	t	f	\N	Need to focus more on English reading.	2026-09-11 07:44:33.103166+05:30	2026-09-11 07:44:33.103166+05:30
193	10	\N	2024-05-02	19	t	t	\N	Multiplication	Decimals	Short sentences	Grammar	t	\N	Good preparation	Matched	72	Partial Upto Date	Lacking	2	5	4	4	4	2	2	2	t	t	f	f	t	t	f	18	t	t	t	t	f	\N	Need to focus more on English reading.	2026-09-11 07:44:33.103166+05:30	2026-09-11 07:44:33.103166+05:30
194	10	\N	2024-06-15	15	f	f	Festival week	Multiplication	Algebra basics	Short sentences	Grammar	t	\N	Good preparation	Matched	65	Upto Date	Sufficient	3	5	5	5	5	4	4	5	f	t	t	t	f	t	t	8	t	t	t	t	t	\N	Overall good progress. Keep it up.	2026-09-11 07:44:33.103166+05:30	2026-09-11 07:44:33.103167+05:30
195	10	\N	2024-07-28	25	t	t	\N	Basic Numbers	Algebra basics	Alphabets	Comprehension	f	\N	Teacher well prepared	Not Matched	70	Upto Date	Lacking	3	3	4	5	2	4	2	2	t	t	f	f	t	t	f	9	t	t	t	t	f	\N	Students are engaged and motivated.	2026-09-11 07:44:33.103167+05:30	2026-09-11 07:44:33.103167+05:30
196	10	\N	2024-09-09	23	t	t	\N	Fractions	Algebra basics	Short sentences	Vocabulary	f	\N	Good preparation	Not Matched	79	Not Uptodate	Lacking	5	5	2	3	4	3	5	4	t	t	t	t	f	f	f	12	f	t	t	t	f	\N	Academic performance is improving steadily.	2026-09-11 07:44:33.103167+05:30	2026-09-11 07:44:33.103167+05:30
197	10	\N	2024-10-21	15	t	f	Festival week	Fractions	Algebra basics	Reading	Comprehension	t	\N	Needs improvement in planning	Not Matched	46	Partial Upto Date	Lacking	4	3	3	2	2	4	4	4	t	t	f	t	f	t	t	27	t	t	t	f	f	\N	Academic performance is improving steadily.	2026-09-11 07:44:33.103167+05:30	2026-09-11 07:44:33.103168+05:30
198	10	\N	2024-12-02	18	t	f	Festival week	Addition, Subtraction	Algebra basics	Reading	Vocabulary	f	\N	Good preparation	Matched	90	Not Uptodate	More than required	2	2	2	3	2	3	4	3	t	t	f	t	f	t	f	18	f	t	t	f	t	\N	Students are engaged and motivated.	2026-09-11 07:44:33.103168+05:30	2026-09-11 07:44:33.103168+05:30
199	10	\N	2025-01-14	19	f	t	Festival week	Addition, Subtraction	Percentages	Short sentences	Vocabulary	t	\N	Needs improvement in planning	Matched	88	Not Uptodate	Lacking	3	3	5	5	5	5	4	2	t	f	t	t	t	t	f	13	t	t	t	f	t	\N	Excellent classroom environment.	2026-09-11 07:44:33.103168+05:30	2026-09-11 07:44:33.103168+05:30
200	10	\N	2025-03-08	32	t	t	\N	Fractions	Decimals	Reading	Essay writing	t	\N	Adequate material ready	Not Matched	40	Partial Upto Date	More than required	3	5	5	3	5	4	5	3	f	t	t	t	t	f	f	14	t	t	t	f	t	\N	Overall good progress. Keep it up.	2026-09-11 07:44:33.103168+05:30	2026-09-11 07:44:33.103168+05:30
201	10	\N	2025-04-16	28	t	f	Weather disruption	Multiplication	Percentages	Reading	Grammar	t	\N	Adequate material ready	Not Matched	80	Not Uptodate	Lacking	2	2	2	5	4	2	5	4	f	f	f	t	f	t	t	19	t	t	f	t	t	\N	Teacher dedication is commendable.	2026-09-11 07:44:33.103169+05:30	2026-09-11 07:44:33.103169+05:30
202	10	\N	2025-06-01	13	t	t	\N	Fractions	Geometry	Short sentences	Vocabulary	t	\N	Teacher well prepared	Not Matched	45	Upto Date	Sufficient	5	3	5	3	5	2	4	5	t	t	t	t	t	t	f	30	f	t	f	f	t	\N	Excellent classroom environment.	2026-09-11 07:44:33.103169+05:30	2026-09-11 07:44:33.103169+05:30
203	10	\N	2025-07-24	14	t	t	\N	Addition, Subtraction	Geometry	Reading	Vocabulary	t	\N	Needs improvement in planning	Not Matched	98	Upto Date	More than required	5	2	2	4	4	2	3	2	t	f	t	t	f	t	f	9	f	t	t	t	f	\N	Overall good progress. Keep it up.	2026-09-11 07:44:33.103169+05:30	2026-09-11 07:44:33.103169+05:30
204	10	\N	2025-09-02	11	t	t	\N	Basic Numbers	Decimals	Short sentences	Vocabulary	f	\N	Teacher well prepared	Not Matched	93	Not Uptodate	More than required	3	3	5	5	5	3	4	2	f	t	t	t	t	t	f	16	t	f	t	t	f	\N	Excellent classroom environment.	2026-09-11 07:44:33.10317+05:30	2026-09-11 07:44:33.10317+05:30
205	10	\N	2025-10-14	12	t	t	\N	Multiplication	Algebra basics	Simple words	Vocabulary	t	\N	Good preparation	Matched	82	Not Uptodate	Sufficient	2	4	3	3	5	2	4	5	t	t	f	t	t	t	f	20	t	t	t	t	t	\N	Students are engaged and motivated.	2026-09-11 07:44:33.10317+05:30	2026-09-11 07:44:33.10317+05:30
206	10	\N	2025-11-20	19	t	t	\N	Basic Numbers	Geometry	Alphabets	Essay writing	t	\N	Good preparation	Not Matched	64	Upto Date	Lacking	3	5	4	4	5	2	2	3	t	t	t	t	t	f	f	9	t	t	t	t	t	\N	Overall good progress. Keep it up.	2026-09-11 07:44:33.10317+05:30	2026-09-11 07:44:33.10317+05:30
207	10	\N	2026-01-03	31	t	f	Teacher absent	Multiplication	Geometry	Short sentences	Vocabulary	t	\N	Some gaps in preparation	Matched	90	Upto Date	Lacking	3	3	5	5	2	2	5	4	t	t	t	f	t	t	f	19	f	t	f	t	t	\N	Teacher dedication is commendable.	2026-09-11 07:44:33.10317+05:30	2026-09-11 07:44:33.103171+05:30
208	10	\N	2026-02-18	12	t	t	\N	Basic Numbers	Algebra basics	Simple words	Essay writing	f	\N	Needs improvement in planning	Not Matched	96	Not Uptodate	Lacking	4	5	4	3	4	4	3	5	f	t	f	t	f	t	t	8	t	t	f	t	f	\N	Excellent classroom environment.	2026-09-11 07:44:33.103171+05:30	2026-09-11 07:44:33.103171+05:30
209	10	\N	2026-04-03	30	t	f	Teacher absent	Addition, Subtraction	Decimals	Alphabets	Essay writing	f	\N	Teacher well prepared	Not Matched	64	Upto Date	More than required	2	2	5	4	3	5	2	3	t	f	t	t	t	f	f	30	t	f	f	t	f	\N	Teacher dedication is commendable.	2026-09-11 07:44:33.103171+05:30	2026-09-11 07:44:33.103171+05:30
210	10	\N	2026-05-12	16	t	t	\N	Basic Numbers	Algebra basics	Short sentences	Vocabulary	t	\N	Needs improvement in planning	Matched	44	Not Uptodate	Sufficient	2	3	4	3	4	3	2	4	t	f	t	t	t	t	f	21	f	t	t	t	f	\N	Need to focus more on English reading.	2026-09-11 07:44:33.103171+05:30	2026-09-11 07:44:33.103171+05:30
211	10	\N	2026-06-15	33	t	t	\N	Multiplication	Algebra basics	Short sentences	Vocabulary	t	\N	Adequate material ready	Matched	65	Upto Date	Lacking	2	2	3	5	2	3	3	3	t	t	t	t	t	t	f	16	t	t	f	f	f	\N	Excellent classroom environment.	2026-09-11 07:44:33.103172+05:30	2026-09-11 07:44:33.103172+05:30
212	10	\N	2026-08-11	34	f	f	Exam preparation	Addition, Subtraction	Decimals	Alphabets	Grammar	f	\N	Good preparation	Not Matched	60	Not Uptodate	Sufficient	3	2	5	2	4	5	2	2	t	t	t	t	t	f	t	27	f	t	t	t	f	\N	Excellent classroom environment.	2026-09-11 07:44:33.103172+05:30	2026-09-11 07:44:33.103172+05:30
213	11	\N	2024-01-10	16	t	t	\N	Addition, Subtraction	Percentages	Simple words	Vocabulary	t	\N	Teacher well prepared	Not Matched	94	Not Uptodate	More than required	4	4	5	4	3	2	5	2	t	f	t	t	t	t	f	18	f	t	t	f	t	\N	Need to focus more on English reading.	2026-09-11 07:44:33.103172+05:30	2026-09-11 07:44:33.103172+05:30
214	11	\N	2024-02-08	27	t	t	\N	Addition, Subtraction	Geometry	Short sentences	Vocabulary	t	\N	Some gaps in preparation	Not Matched	42	Upto Date	Sufficient	3	4	3	3	4	3	4	3	t	t	f	f	t	t	f	28	f	t	f	t	t	\N	Need to focus more on English reading.	2026-09-11 07:44:33.103173+05:30	2026-09-11 07:44:33.103173+05:30
215	11	\N	2024-03-18	26	f	t	Exam preparation	Addition, Subtraction	Algebra basics	Simple words	Comprehension	f	\N	Needs improvement in planning	Not Matched	84	Partial Upto Date	Lacking	5	3	2	3	4	3	4	3	t	f	f	f	f	f	t	10	f	f	t	t	f	\N	Academic performance is improving steadily.	2026-09-11 07:44:33.103173+05:30	2026-09-11 07:44:33.103173+05:30
216	11	\N	2024-05-06	21	f	f	Exam preparation	Basic Numbers	Geometry	Short sentences	Essay writing	t	\N	Teacher well prepared	Not Matched	70	Partial Upto Date	More than required	5	2	3	3	3	5	3	5	t	t	t	t	f	t	t	12	f	t	t	t	t	\N	Attendance needs improvement.	2026-09-11 07:44:33.103173+05:30	2026-09-11 07:44:33.103173+05:30
217	11	\N	2024-06-01	24	t	t	\N	Basic Numbers	Decimals	Reading	Essay writing	f	\N	Adequate material ready	Not Matched	64	Upto Date	Sufficient	5	3	4	2	4	2	4	2	f	f	t	t	t	t	t	29	t	t	f	t	f	\N	Students are engaged and motivated.	2026-09-11 07:44:33.103173+05:30	2026-09-11 07:44:33.103174+05:30
218	11	\N	2024-07-06	34	t	f	Weather disruption	Addition, Subtraction	Percentages	Short sentences	Essay writing	f	\N	Teacher well prepared	Not Matched	92	Not Uptodate	More than required	2	5	3	5	3	3	3	5	t	t	t	t	f	t	t	18	f	t	f	t	f	\N	Attendance needs improvement.	2026-09-11 07:44:33.103174+05:30	2026-09-11 07:44:33.103174+05:30
219	11	\N	2024-08-30	14	f	t	Festival week	Fractions	Algebra basics	Reading	Essay writing	t	\N	Teacher well prepared	Not Matched	83	Partial Upto Date	More than required	4	4	2	2	3	3	4	5	f	t	t	t	t	t	f	28	f	t	t	t	t	\N	Academic performance is improving steadily.	2026-09-11 07:44:33.103174+05:30	2026-09-11 07:44:33.103174+05:30
220	11	\N	2024-10-10	15	t	t	\N	Multiplication	Algebra basics	Reading	Essay writing	t	\N	Adequate material ready	Matched	69	Upto Date	Lacking	2	3	4	5	5	3	2	3	t	t	t	f	f	t	t	17	t	t	t	t	f	\N	Excellent classroom environment.	2026-09-11 07:44:33.103174+05:30	2026-09-11 07:44:33.103174+05:30
221	11	\N	2024-11-20	24	t	t	\N	Fractions	Geometry	Alphabets	Comprehension	t	\N	Teacher well prepared	Matched	73	Partial Upto Date	More than required	5	5	5	2	2	4	5	4	t	t	t	t	f	t	t	13	f	t	t	f	t	\N	Teacher dedication is commendable.	2026-09-11 07:44:33.103175+05:30	2026-09-11 07:44:33.103175+05:30
222	11	\N	2024-12-24	11	t	t	\N	Multiplication	Geometry	Short sentences	Essay writing	t	\N	Good preparation	Matched	98	Partial Upto Date	Lacking	2	4	2	2	4	5	5	3	t	t	t	t	t	t	f	18	t	f	t	t	t	\N	Teacher dedication is commendable.	2026-09-11 07:44:33.103175+05:30	2026-09-11 07:44:33.103175+05:30
223	11	\N	2025-02-14	33	f	t	Exam preparation	Basic Numbers	Decimals	Alphabets	Grammar	t	\N	Needs improvement in planning	Not Matched	48	Partial Upto Date	Lacking	3	3	2	2	3	4	2	5	t	t	t	t	t	t	t	29	t	t	t	t	t	\N	Attendance needs improvement.	2026-09-11 07:44:33.103175+05:30	2026-09-11 07:44:33.103175+05:30
224	11	\N	2025-03-25	29	t	t	\N	Addition, Subtraction	Algebra basics	Reading	Comprehension	f	\N	Adequate material ready	Matched	52	Upto Date	Sufficient	5	2	2	4	3	2	3	2	f	f	t	t	t	t	f	18	t	t	t	t	f	\N	Overall good progress. Keep it up.	2026-09-11 07:44:33.103176+05:30	2026-09-11 07:44:33.103176+05:30
225	11	\N	2025-05-05	20	t	t	\N	Multiplication	Algebra basics	Reading	Essay writing	t	\N	Needs improvement in planning	Not Matched	54	Upto Date	More than required	4	4	2	2	3	5	4	5	f	t	t	f	f	t	t	27	t	t	t	f	t	\N	Need to focus more on English reading.	2026-09-11 07:44:33.103176+05:30	2026-09-11 07:44:33.103176+05:30
226	11	\N	2025-06-07	32	t	f	Weather disruption	Basic Numbers	Algebra basics	Short sentences	Grammar	t	\N	Some gaps in preparation	Not Matched	64	Not Uptodate	More than required	3	2	3	2	2	4	3	5	f	t	t	t	t	t	t	28	t	f	t	f	f	\N	Students are engaged and motivated.	2026-09-11 07:44:33.103176+05:30	2026-09-11 07:44:33.103176+05:30
227	11	\N	2025-07-24	34	t	t	\N	Addition, Subtraction	Decimals	Short sentences	Grammar	t	\N	Adequate material ready	Not Matched	55	Upto Date	More than required	2	3	3	5	4	3	5	2	t	t	f	t	f	f	t	10	t	t	f	t	t	\N	Attendance needs improvement.	2026-09-11 07:44:33.103176+05:30	2026-09-11 07:44:33.103177+05:30
228	11	\N	2025-09-17	33	t	t	\N	Multiplication	Geometry	Reading	Comprehension	t	\N	Adequate material ready	Not Matched	76	Partial Upto Date	More than required	3	4	5	2	4	5	5	3	t	t	t	t	t	f	f	8	f	t	t	f	f	\N	Excellent classroom environment.	2026-09-11 07:44:33.103177+05:30	2026-09-11 07:44:33.103177+05:30
229	11	\N	2025-10-26	15	t	t	\N	Fractions	Decimals	Reading	Essay writing	t	\N	Teacher well prepared	Not Matched	44	Partial Upto Date	Sufficient	5	3	3	3	2	2	4	5	t	t	t	t	t	t	t	21	f	f	t	f	t	\N	Students are engaged and motivated.	2026-09-11 07:44:33.103177+05:30	2026-09-11 07:44:33.103177+05:30
230	11	\N	2025-11-29	34	f	f	Weather disruption	Basic Numbers	Percentages	Alphabets	Vocabulary	f	\N	Needs improvement in planning	Matched	70	Upto Date	Lacking	2	3	4	5	3	4	3	3	t	f	t	f	t	t	t	24	f	f	t	t	f	\N	Excellent classroom environment.	2026-09-11 07:44:33.103177+05:30	2026-09-11 07:44:33.103178+05:30
231	11	\N	2026-01-23	22	f	t	Weather disruption	Basic Numbers	Algebra basics	Alphabets	Essay writing	f	\N	Adequate material ready	Matched	99	Not Uptodate	Lacking	4	2	3	5	2	2	2	5	t	t	t	t	t	t	t	23	t	f	t	f	t	\N	Students are engaged and motivated.	2026-09-11 07:44:33.103178+05:30	2026-09-11 07:44:33.103178+05:30
232	11	\N	2026-03-09	34	t	t	\N	Multiplication	Percentages	Reading	Vocabulary	t	\N	Some gaps in preparation	Matched	95	Not Uptodate	Sufficient	2	4	2	5	2	4	2	4	t	t	t	f	t	t	t	29	t	f	t	t	t	\N	Attendance needs improvement.	2026-09-11 07:44:33.103178+05:30	2026-09-11 07:44:33.103178+05:30
233	11	\N	2026-04-15	34	t	f	Weather disruption	Basic Numbers	Decimals	Short sentences	Vocabulary	t	\N	Adequate material ready	Not Matched	92	Upto Date	Lacking	5	5	2	4	4	2	2	5	f	t	f	f	t	t	f	30	f	t	t	t	f	\N	Excellent classroom environment.	2026-09-11 07:44:33.103178+05:30	2026-09-11 07:44:33.103178+05:30
234	11	\N	2026-05-25	30	t	t	\N	Fractions	Algebra basics	Short sentences	Grammar	f	\N	Adequate material ready	Not Matched	54	Not Uptodate	Lacking	5	2	4	5	5	2	5	4	t	t	f	f	f	t	t	12	t	t	f	f	f	\N	Students are engaged and motivated.	2026-09-11 07:44:33.103179+05:30	2026-09-11 07:44:33.103179+05:30
235	11	\N	2026-07-21	25	f	f	Festival week	Multiplication	Geometry	Simple words	Grammar	t	\N	Good preparation	Matched	99	Partial Upto Date	Lacking	4	3	4	5	2	3	5	2	f	t	t	t	f	t	f	20	f	t	t	t	f	\N	Academic performance is improving steadily.	2026-09-11 07:44:33.103179+05:30	2026-09-11 07:44:33.103179+05:30
236	11	\N	2026-08-23	19	t	t	\N	Addition, Subtraction	Algebra basics	Alphabets	Essay writing	t	\N	Needs improvement in planning	Matched	76	Partial Upto Date	Sufficient	4	5	2	4	2	3	5	5	t	t	t	f	t	t	t	11	t	t	t	t	f	\N	Academic performance is improving steadily.	2026-09-11 07:44:33.103179+05:30	2026-09-11 07:44:33.103179+05:30
237	12	\N	2024-02-24	35	t	f	Teacher absent	Fractions	Decimals	Simple words	Comprehension	t	\N	Teacher well prepared	Not Matched	97	Upto Date	Sufficient	3	3	2	4	2	3	5	5	t	t	t	t	t	f	t	24	t	t	f	t	f	\N	Students are engaged and motivated.	2026-09-11 07:44:33.10318+05:30	2026-09-11 07:44:33.10318+05:30
238	12	\N	2024-04-08	25	t	t	\N	Fractions	Geometry	Reading	Grammar	f	\N	Teacher well prepared	Not Matched	80	Not Uptodate	Lacking	4	2	2	2	2	2	5	3	t	t	t	t	t	f	t	20	t	t	t	t	t	\N	Need to focus more on English reading.	2026-09-11 07:44:33.10318+05:30	2026-09-11 07:44:33.10318+05:30
239	12	\N	2024-05-07	35	t	f	Festival week	Basic Numbers	Algebra basics	Reading	Vocabulary	t	\N	Some gaps in preparation	Matched	88	Upto Date	More than required	2	3	3	2	5	4	2	2	t	t	t	t	f	t	t	24	t	f	t	f	t	\N	Students are engaged and motivated.	2026-09-11 07:44:33.10318+05:30	2026-09-11 07:44:33.10318+05:30
240	12	\N	2024-06-27	26	t	f	Weather disruption	Basic Numbers	Geometry	Reading	Essay writing	t	\N	Adequate material ready	Matched	84	Upto Date	More than required	2	3	2	3	3	4	3	3	t	t	t	t	t	t	f	16	t	f	t	t	f	\N	Teacher dedication is commendable.	2026-09-11 07:44:33.10318+05:30	2026-09-11 07:44:33.103181+05:30
241	12	\N	2024-08-01	27	t	t	\N	Multiplication	Algebra basics	Short sentences	Comprehension	t	\N	Some gaps in preparation	Matched	66	Upto Date	Lacking	5	5	2	3	2	4	2	2	t	t	t	t	f	f	t	15	t	t	f	t	t	\N	Academic performance is improving steadily.	2026-09-11 07:44:33.103181+05:30	2026-09-11 07:44:33.103181+05:30
242	12	\N	2024-09-07	33	f	t	Weather disruption	Basic Numbers	Algebra basics	Short sentences	Essay writing	t	\N	Some gaps in preparation	Matched	97	Upto Date	Sufficient	4	5	3	4	5	5	3	4	t	t	t	t	t	t	t	28	f	t	t	t	f	\N	Students are engaged and motivated.	2026-09-11 07:44:33.103181+05:30	2026-09-11 07:44:33.103181+05:30
243	12	\N	2024-11-08	24	t	t	\N	Fractions	Percentages	Reading	Comprehension	t	\N	Good preparation	Not Matched	66	Partial Upto Date	Sufficient	2	2	3	2	3	2	2	4	t	t	f	f	t	t	t	23	t	t	t	t	t	\N	Attendance needs improvement.	2026-09-11 07:44:33.103181+05:30	2026-09-11 07:44:33.103182+05:30
244	12	\N	2024-12-14	33	t	t	\N	Addition, Subtraction	Decimals	Short sentences	Comprehension	f	\N	Some gaps in preparation	Matched	78	Partial Upto Date	Sufficient	3	3	2	4	3	4	2	5	t	t	f	t	t	f	t	17	t	t	t	t	f	\N	Students are engaged and motivated.	2026-09-11 07:44:33.103182+05:30	2026-09-11 07:44:33.103182+05:30
245	12	\N	2025-01-24	30	f	f	Teacher absent	Basic Numbers	Decimals	Alphabets	Essay writing	t	\N	Teacher well prepared	Not Matched	59	Partial Upto Date	Sufficient	2	4	3	5	4	2	2	5	t	t	t	t	t	t	t	29	t	t	t	t	t	\N	Excellent classroom environment.	2026-09-11 07:44:33.103182+05:30	2026-09-11 07:44:33.103182+05:30
246	12	\N	2025-02-27	24	f	t	Exam preparation	Multiplication	Geometry	Short sentences	Vocabulary	t	\N	Needs improvement in planning	Matched	52	Partial Upto Date	Sufficient	3	5	5	4	2	3	3	5	f	f	t	t	t	t	t	18	f	f	t	t	f	\N	Students are engaged and motivated.	2026-09-11 07:44:33.103182+05:30	2026-09-11 07:44:33.103182+05:30
247	12	\N	2025-04-03	10	t	t	\N	Multiplication	Geometry	Short sentences	Grammar	f	\N	Needs improvement in planning	Matched	83	Partial Upto Date	Lacking	2	5	5	4	4	5	2	5	t	t	t	t	f	f	t	29	f	t	t	f	t	\N	Students are engaged and motivated.	2026-09-11 07:44:33.103183+05:30	2026-09-11 07:44:33.103183+05:30
248	12	\N	2025-05-10	30	f	t	Festival week	Multiplication	Algebra basics	Simple words	Vocabulary	t	\N	Needs improvement in planning	Matched	67	Upto Date	More than required	3	2	2	5	5	4	3	3	t	t	t	t	t	t	f	19	t	t	f	t	t	\N	Overall good progress. Keep it up.	2026-09-11 07:44:33.103183+05:30	2026-09-11 07:44:33.103183+05:30
249	12	\N	2025-07-03	19	t	t	\N	Basic Numbers	Percentages	Alphabets	Vocabulary	t	\N	Teacher well prepared	Not Matched	61	Partial Upto Date	Sufficient	2	2	3	4	4	4	4	3	t	t	t	f	t	t	t	9	t	f	t	t	f	\N	Overall good progress. Keep it up.	2026-09-11 07:44:33.103183+05:30	2026-09-11 07:44:33.103183+05:30
250	12	\N	2025-08-13	20	t	t	\N	Fractions	Decimals	Simple words	Comprehension	t	\N	Needs improvement in planning	Not Matched	75	Not Uptodate	Lacking	4	4	5	2	5	2	5	5	t	f	f	t	t	f	f	9	f	t	f	t	f	\N	Attendance needs improvement.	2026-09-11 07:44:33.103184+05:30	2026-09-11 07:44:33.103184+05:30
251	12	\N	2025-09-13	12	t	f	Festival week	Basic Numbers	Decimals	Reading	Vocabulary	t	\N	Needs improvement in planning	Matched	40	Upto Date	More than required	3	2	5	4	4	3	4	4	t	t	t	t	t	t	f	12	t	f	t	t	t	\N	Excellent classroom environment.	2026-09-11 07:44:33.103184+05:30	2026-09-11 07:44:33.103184+05:30
252	12	\N	2025-11-09	30	t	t	\N	Fractions	Percentages	Alphabets	Essay writing	t	\N	Teacher well prepared	Not Matched	60	Upto Date	More than required	2	4	3	4	3	4	2	2	t	t	f	t	t	t	t	22	t	t	t	f	f	\N	Students are engaged and motivated.	2026-09-11 07:44:33.103184+05:30	2026-09-11 07:44:33.103184+05:30
253	12	\N	2026-01-01	23	t	t	\N	Fractions	Geometry	Reading	Grammar	t	\N	Teacher well prepared	Matched	92	Upto Date	Sufficient	5	3	4	2	4	3	3	5	t	t	t	t	t	t	f	11	t	t	f	t	t	\N	Attendance needs improvement.	2026-09-11 07:44:33.103184+05:30	2026-09-11 07:44:33.103185+05:30
254	12	\N	2026-02-13	10	t	t	\N	Addition, Subtraction	Geometry	Simple words	Grammar	t	\N	Some gaps in preparation	Matched	90	Upto Date	Sufficient	4	2	3	3	5	5	3	4	t	t	t	t	t	t	t	11	t	t	f	t	t	\N	Students are engaged and motivated.	2026-09-11 07:44:33.103185+05:30	2026-09-11 07:44:33.103185+05:30
255	12	\N	2026-03-22	14	t	t	\N	Fractions	Percentages	Simple words	Vocabulary	t	\N	Good preparation	Not Matched	50	Upto Date	Sufficient	2	4	4	2	4	2	4	2	f	t	t	t	t	t	t	29	t	t	t	f	f	\N	Attendance needs improvement.	2026-09-11 07:44:33.103185+05:30	2026-09-11 07:44:33.103185+05:30
256	12	\N	2026-05-12	35	t	f	Teacher absent	Addition, Subtraction	Geometry	Simple words	Essay writing	t	\N	Teacher well prepared	Not Matched	92	Upto Date	Sufficient	5	4	3	2	4	3	3	5	t	t	t	f	t	t	t	28	f	t	t	t	f	\N	Excellent classroom environment.	2026-09-11 07:44:33.103185+05:30	2026-09-11 07:44:33.103186+05:30
257	12	\N	2026-06-30	12	t	t	\N	Basic Numbers	Geometry	Alphabets	Comprehension	t	\N	Needs improvement in planning	Matched	63	Not Uptodate	Lacking	3	2	2	4	4	3	4	5	t	f	f	f	t	f	t	12	t	t	t	t	f	\N	Need to focus more on English reading.	2026-09-11 07:44:33.103186+05:30	2026-09-11 07:44:33.103186+05:30
258	12	\N	2026-08-02	28	t	t	\N	Addition, Subtraction	Decimals	Simple words	Grammar	t	\N	Needs improvement in planning	Matched	55	Upto Date	Sufficient	5	3	3	5	3	4	5	5	t	t	t	t	t	t	t	27	f	t	t	f	f	\N	Excellent classroom environment.	2026-09-11 07:44:33.103186+05:30	2026-09-11 07:44:33.103186+05:30
259	13	\N	2024-02-11	18	t	t	\N	Addition, Subtraction	Algebra basics	Reading	Grammar	t	\N	Good preparation	Not Matched	40	Partial Upto Date	Lacking	5	3	4	5	4	3	2	4	t	t	t	f	t	t	f	23	t	f	t	t	f	\N	Overall good progress. Keep it up.	2026-09-11 07:44:33.103186+05:30	2026-09-11 07:44:33.103186+05:30
260	13	\N	2024-03-28	32	f	t	Festival week	Multiplication	Geometry	Simple words	Essay writing	t	\N	Needs improvement in planning	Not Matched	58	Partial Upto Date	More than required	5	2	5	3	3	2	3	5	t	t	f	t	f	f	t	23	t	t	f	t	f	\N	Excellent classroom environment.	2026-09-11 07:44:33.103187+05:30	2026-09-11 07:44:33.103187+05:30
261	13	\N	2024-05-07	15	t	t	\N	Basic Numbers	Percentages	Reading	Essay writing	f	\N	Teacher well prepared	Matched	100	Upto Date	More than required	5	2	4	4	5	5	3	5	t	f	f	t	t	t	f	29	t	f	t	f	t	\N	Students are engaged and motivated.	2026-09-11 07:44:33.103187+05:30	2026-09-11 07:44:33.103187+05:30
262	13	\N	2024-06-25	15	f	t	Exam preparation	Addition, Subtraction	Geometry	Reading	Vocabulary	t	\N	Adequate material ready	Not Matched	69	Not Uptodate	More than required	5	2	2	3	2	5	5	3	t	t	t	t	t	t	t	16	t	t	f	t	t	\N	Need to focus more on English reading.	2026-09-11 07:44:33.103187+05:30	2026-09-11 07:44:33.103187+05:30
263	13	\N	2024-08-13	34	t	f	Exam preparation	Addition, Subtraction	Percentages	Reading	Vocabulary	t	\N	Needs improvement in planning	Matched	100	Not Uptodate	Lacking	4	4	3	2	3	2	4	5	t	f	t	t	t	f	t	9	t	f	t	f	t	\N	Students are engaged and motivated.	2026-09-11 07:44:33.103187+05:30	2026-09-11 07:44:33.103188+05:30
264	13	\N	2024-09-13	25	t	t	\N	Multiplication	Decimals	Short sentences	Vocabulary	f	\N	Some gaps in preparation	Matched	44	Not Uptodate	More than required	3	4	4	2	3	5	3	5	f	t	f	t	t	t	f	12	t	t	t	t	t	\N	Attendance needs improvement.	2026-09-11 07:44:33.103188+05:30	2026-09-11 07:44:33.103188+05:30
265	13	\N	2024-10-28	29	t	f	Exam preparation	Multiplication	Percentages	Simple words	Comprehension	f	\N	Some gaps in preparation	Matched	63	Partial Upto Date	Sufficient	4	4	2	5	5	5	5	4	t	t	t	f	t	t	f	19	t	t	t	t	f	\N	Teacher dedication is commendable.	2026-09-11 07:44:33.103188+05:30	2026-09-11 07:44:33.103188+05:30
266	13	\N	2024-12-13	13	t	t	\N	Addition, Subtraction	Algebra basics	Alphabets	Grammar	t	\N	Teacher well prepared	Matched	71	Not Uptodate	More than required	2	5	2	4	5	3	3	5	t	t	f	f	t	f	f	21	f	t	f	t	f	\N	Academic performance is improving steadily.	2026-09-11 07:44:33.103188+05:30	2026-09-11 07:44:33.103189+05:30
267	13	\N	2025-01-28	31	t	t	\N	Fractions	Percentages	Reading	Comprehension	t	\N	Teacher well prepared	Matched	40	Upto Date	Sufficient	4	4	4	3	5	3	5	3	t	t	t	f	t	f	f	13	t	t	t	t	t	\N	Excellent classroom environment.	2026-09-11 07:44:33.103189+05:30	2026-09-11 07:44:33.103189+05:30
268	13	\N	2025-03-18	22	t	t	\N	Fractions	Geometry	Short sentences	Comprehension	t	\N	Good preparation	Not Matched	40	Not Uptodate	More than required	3	2	2	5	2	3	5	4	t	t	t	t	f	t	f	16	t	t	f	t	t	\N	Overall good progress. Keep it up.	2026-09-11 07:44:33.103189+05:30	2026-09-11 07:44:33.103189+05:30
269	13	\N	2025-04-16	13	t	t	\N	Multiplication	Percentages	Short sentences	Comprehension	t	\N	Teacher well prepared	Not Matched	98	Upto Date	Lacking	2	5	2	5	2	5	2	3	t	t	t	f	f	t	t	13	t	t	f	t	f	\N	Need to focus more on English reading.	2026-09-11 07:44:33.103189+05:30	2026-09-11 07:44:33.103189+05:30
270	13	\N	2025-06-20	27	t	t	\N	Addition, Subtraction	Geometry	Short sentences	Grammar	t	\N	Good preparation	Matched	73	Not Uptodate	Sufficient	3	4	2	3	2	4	3	3	t	t	t	t	t	t	f	22	t	t	t	t	t	\N	Need to focus more on English reading.	2026-09-11 07:44:33.10319+05:30	2026-09-11 07:44:33.10319+05:30
271	13	\N	2025-07-24	32	t	t	\N	Fractions	Decimals	Alphabets	Essay writing	t	\N	Needs improvement in planning	Not Matched	67	Partial Upto Date	Lacking	4	4	2	5	5	3	4	4	f	f	t	f	f	t	f	17	t	f	f	t	f	\N	Overall good progress. Keep it up.	2026-09-11 07:44:33.10319+05:30	2026-09-11 07:44:33.10319+05:30
272	13	\N	2025-09-02	23	t	f	Festival week	Fractions	Geometry	Alphabets	Comprehension	t	\N	Adequate material ready	Matched	89	Partial Upto Date	Sufficient	2	4	2	4	3	5	4	3	t	t	t	t	t	t	t	26	f	t	f	t	f	\N	Students are engaged and motivated.	2026-09-11 07:44:33.10319+05:30	2026-09-11 07:44:33.10319+05:30
273	13	\N	2025-10-09	25	t	f	Teacher absent	Fractions	Decimals	Alphabets	Grammar	t	\N	Some gaps in preparation	Not Matched	77	Partial Upto Date	Sufficient	2	4	2	2	5	4	3	5	t	t	t	t	t	t	f	17	t	f	t	t	f	\N	Attendance needs improvement.	2026-09-11 07:44:33.103191+05:30	2026-09-11 07:44:33.103191+05:30
274	13	\N	2025-12-11	32	t	t	\N	Basic Numbers	Decimals	Alphabets	Essay writing	f	\N	Good preparation	Matched	54	Upto Date	Sufficient	3	2	4	5	3	3	2	3	t	f	f	t	t	t	t	16	f	t	t	t	f	\N	Need to focus more on English reading.	2026-09-11 07:44:33.103191+05:30	2026-09-11 07:44:33.103191+05:30
275	13	\N	2026-01-06	22	t	f	Weather disruption	Multiplication	Geometry	Reading	Grammar	t	\N	Needs improvement in planning	Not Matched	80	Partial Upto Date	More than required	2	3	5	5	4	4	5	3	t	f	t	t	f	t	t	30	t	f	t	t	t	\N	Attendance needs improvement.	2026-09-11 07:44:33.103191+05:30	2026-09-11 07:44:33.103191+05:30
276	13	\N	2026-02-26	13	f	t	Weather disruption	Multiplication	Percentages	Short sentences	Vocabulary	t	\N	Some gaps in preparation	Matched	98	Upto Date	Sufficient	4	5	5	3	5	3	2	4	t	t	f	t	t	t	t	11	t	f	t	t	f	\N	Need to focus more on English reading.	2026-09-11 07:44:33.103191+05:30	2026-09-11 07:44:33.103192+05:30
277	13	\N	2026-04-15	12	t	f	Weather disruption	Basic Numbers	Geometry	Simple words	Vocabulary	t	\N	Some gaps in preparation	Not Matched	43	Partial Upto Date	Lacking	4	2	2	5	5	3	4	3	t	t	t	t	t	t	t	11	t	t	t	t	t	\N	Excellent classroom environment.	2026-09-11 07:44:33.103192+05:30	2026-09-11 07:44:33.103192+05:30
278	13	\N	2026-05-08	29	t	t	\N	Basic Numbers	Decimals	Reading	Grammar	t	\N	Adequate material ready	Not Matched	53	Upto Date	Sufficient	4	4	4	2	2	3	5	4	f	t	t	t	t	t	f	12	f	t	t	t	f	\N	Overall good progress. Keep it up.	2026-09-11 07:44:33.103192+05:30	2026-09-11 07:44:33.103192+05:30
279	13	\N	2026-07-05	10	t	f	Weather disruption	Basic Numbers	Algebra basics	Reading	Comprehension	t	\N	Good preparation	Matched	76	Not Uptodate	Lacking	3	3	3	2	2	4	4	5	t	t	t	t	t	t	f	17	t	f	f	f	f	\N	Overall good progress. Keep it up.	2026-09-11 07:44:33.103192+05:30	2026-09-11 07:44:33.103192+05:30
280	13	\N	2026-07-30	30	t	t	\N	Addition, Subtraction	Geometry	Reading	Comprehension	t	\N	Needs improvement in planning	Not Matched	71	Upto Date	Sufficient	5	4	3	2	3	5	2	4	f	t	f	t	f	t	f	29	t	t	t	f	f	\N	Need to focus more on English reading.	2026-09-11 07:44:33.103193+05:30	2026-09-11 07:44:33.103193+05:30
281	2	\N	2024-01-11	29	t	f	Weather disruption	Multiplication	Algebra basics	Alphabets	Comprehension	f	\N	Good preparation	Matched	95	Upto Date	Lacking	4	5	4	3	4	4	3	4	t	t	t	t	t	t	f	20	t	f	t	t	f	\N	Academic performance is improving steadily.	2026-09-11 08:02:50.12606+05:30	2026-09-11 08:02:50.126062+05:30
282	2	\N	2024-01-29	11	f	t	Weather disruption	Basic Numbers	Percentages	Alphabets	Comprehension	f	\N	Some gaps in preparation	Not Matched	53	Not Uptodate	Lacking	5	5	3	4	3	3	4	5	f	t	t	f	t	t	t	11	t	t	t	t	f	\N	Attendance needs improvement.	2026-09-11 08:02:50.126063+05:30	2026-09-11 08:02:50.126063+05:30
283	2	\N	2024-03-19	18	t	t	\N	Addition, Subtraction	Algebra basics	Short sentences	Essay writing	t	\N	Teacher well prepared	Matched	69	Upto Date	More than required	4	3	2	4	3	3	4	3	t	f	t	t	t	t	f	17	t	t	t	t	f	\N	Academic performance is improving steadily.	2026-09-11 08:02:50.126064+05:30	2026-09-11 08:02:50.126064+05:30
284	2	\N	2024-04-27	34	t	f	Festival week	Multiplication	Decimals	Simple words	Essay writing	t	\N	Some gaps in preparation	Not Matched	53	Not Uptodate	More than required	3	4	5	4	5	5	2	3	t	t	t	t	t	t	t	15	t	t	t	t	f	\N	Teacher dedication is commendable.	2026-09-11 08:02:50.126064+05:30	2026-09-11 08:02:50.126064+05:30
285	2	\N	2024-07-25	33	t	t	\N	Basic Numbers	Geometry	Reading	Vocabulary	t	\N	Good preparation	Not Matched	62	Partial Upto Date	Lacking	5	2	2	2	5	4	2	3	t	t	t	t	t	f	t	22	f	f	t	t	t	\N	Overall good progress. Keep it up.	2026-09-11 08:02:50.126065+05:30	2026-09-11 08:02:50.126065+05:30
286	2	\N	2024-08-25	15	f	f	Exam preparation	Basic Numbers	Decimals	Simple words	Vocabulary	f	\N	Needs improvement in planning	Not Matched	40	Partial Upto Date	Lacking	5	4	5	5	3	3	4	3	f	t	t	t	t	t	t	9	f	t	t	t	t	\N	Attendance needs improvement.	2026-09-11 08:02:50.126065+05:30	2026-09-11 08:02:50.126065+05:30
287	2	\N	2024-09-30	17	t	f	Teacher absent	Addition, Subtraction	Decimals	Short sentences	Essay writing	t	\N	Adequate material ready	Matched	56	Partial Upto Date	Sufficient	4	5	4	2	2	5	2	2	t	t	t	t	t	t	f	13	t	t	t	f	t	\N	Teacher dedication is commendable.	2026-09-11 08:02:50.126065+05:30	2026-09-11 08:02:50.126065+05:30
288	2	\N	2024-11-15	31	f	t	Teacher absent	Multiplication	Percentages	Alphabets	Grammar	t	\N	Needs improvement in planning	Not Matched	58	Not Uptodate	Sufficient	4	3	4	5	4	2	2	5	f	t	t	t	f	t	f	25	t	t	t	f	t	\N	Excellent classroom environment.	2026-09-11 08:02:50.126066+05:30	2026-09-11 08:02:50.126066+05:30
289	2	\N	2024-12-30	27	t	t	\N	Multiplication	Decimals	Simple words	Grammar	t	\N	Good preparation	Not Matched	53	Not Uptodate	Sufficient	2	4	5	3	3	3	3	5	t	t	t	f	f	f	t	16	t	t	t	t	f	\N	Students are engaged and motivated.	2026-09-11 08:02:50.126066+05:30	2026-09-11 08:02:50.126066+05:30
290	2	\N	2025-02-12	21	t	f	Weather disruption	Multiplication	Geometry	Alphabets	Comprehension	t	\N	Adequate material ready	Matched	89	Partial Upto Date	Lacking	5	4	2	2	4	3	4	2	t	t	t	t	t	t	f	26	t	t	t	t	t	\N	Need to focus more on English reading.	2026-09-11 08:02:50.126066+05:30	2026-09-11 08:02:50.126066+05:30
291	2	\N	2025-03-19	20	t	f	Weather disruption	Addition, Subtraction	Percentages	Short sentences	Vocabulary	t	\N	Adequate material ready	Matched	52	Partial Upto Date	More than required	5	3	4	5	2	4	4	3	t	t	t	t	t	t	f	13	t	t	t	t	t	\N	Academic performance is improving steadily.	2026-09-11 08:02:50.126067+05:30	2026-09-11 08:02:50.126067+05:30
292	2	\N	2025-05-18	19	f	t	Festival week	Multiplication	Geometry	Alphabets	Grammar	t	\N	Teacher well prepared	Matched	69	Partial Upto Date	More than required	3	5	5	5	3	3	2	2	f	t	f	t	t	t	t	22	t	t	t	t	f	\N	Academic performance is improving steadily.	2026-09-11 08:02:50.126067+05:30	2026-09-11 08:02:50.126067+05:30
293	2	\N	2025-06-12	33	f	t	Exam preparation	Basic Numbers	Geometry	Reading	Vocabulary	t	\N	Needs improvement in planning	Not Matched	89	Not Uptodate	Lacking	3	4	5	2	4	3	4	4	t	t	t	t	t	t	t	21	t	t	t	t	f	\N	Attendance needs improvement.	2026-09-11 08:02:50.126067+05:30	2026-09-11 08:02:50.126067+05:30
294	2	\N	2025-08-04	32	f	t	Teacher absent	Basic Numbers	Decimals	Alphabets	Essay writing	t	\N	Teacher well prepared	Not Matched	74	Not Uptodate	More than required	3	5	3	4	5	5	2	5	t	t	t	t	t	t	t	20	t	t	t	t	f	\N	Students are engaged and motivated.	2026-09-11 08:02:50.126068+05:30	2026-09-11 08:02:50.126068+05:30
295	2	\N	2025-09-13	16	t	t	\N	Basic Numbers	Percentages	Short sentences	Vocabulary	t	\N	Teacher well prepared	Not Matched	93	Upto Date	Lacking	2	2	4	3	2	2	2	3	t	t	t	t	t	t	t	22	t	f	t	t	t	\N	Academic performance is improving steadily.	2026-09-11 08:02:50.126068+05:30	2026-09-11 08:02:50.126068+05:30
296	2	\N	2025-10-20	13	f	f	Teacher absent	Fractions	Decimals	Reading	Comprehension	t	\N	Needs improvement in planning	Matched	84	Partial Upto Date	More than required	2	2	4	5	4	2	4	2	f	f	t	f	t	f	t	21	t	t	t	t	f	\N	Attendance needs improvement.	2026-09-11 08:02:50.126068+05:30	2026-09-11 08:02:50.126068+05:30
297	2	\N	2025-12-01	18	t	t	\N	Fractions	Geometry	Alphabets	Essay writing	f	\N	Needs improvement in planning	Not Matched	76	Not Uptodate	More than required	5	4	2	5	4	3	5	3	t	t	t	t	f	t	t	10	t	t	t	t	f	\N	Teacher dedication is commendable.	2026-09-11 08:02:50.126069+05:30	2026-09-11 08:02:50.126069+05:30
298	2	\N	2026-01-16	10	t	t	\N	Addition, Subtraction	Percentages	Simple words	Vocabulary	t	\N	Adequate material ready	Not Matched	70	Not Uptodate	More than required	4	5	4	4	5	4	4	4	t	t	t	t	f	t	t	14	t	t	t	f	f	\N	Overall good progress. Keep it up.	2026-09-11 08:02:50.126069+05:30	2026-09-11 08:02:50.126069+05:30
299	2	\N	2026-02-22	21	f	t	Festival week	Fractions	Algebra basics	Simple words	Essay writing	t	\N	Good preparation	Not Matched	84	Upto Date	More than required	5	2	2	4	5	5	5	4	t	t	f	t	f	t	t	26	t	t	t	t	f	\N	Overall good progress. Keep it up.	2026-09-11 08:02:50.126069+05:30	2026-09-11 08:02:50.126069+05:30
300	2	\N	2026-04-17	34	f	t	Exam preparation	Multiplication	Decimals	Reading	Vocabulary	t	\N	Some gaps in preparation	Not Matched	59	Not Uptodate	More than required	2	2	3	3	4	2	3	3	t	t	t	t	t	t	t	17	t	t	t	t	f	\N	Academic performance is improving steadily.	2026-09-11 08:02:50.126069+05:30	2026-09-11 08:02:50.12607+05:30
301	2	\N	2026-05-12	35	f	t	Festival week	Basic Numbers	Algebra basics	Simple words	Comprehension	f	\N	Needs improvement in planning	Matched	43	Upto Date	Lacking	4	5	2	5	4	5	4	5	t	t	f	t	t	t	t	29	f	t	f	f	f	\N	Excellent classroom environment.	2026-09-11 08:02:50.12607+05:30	2026-09-11 08:02:50.12607+05:30
302	2	\N	2026-07-16	25	t	f	Exam preparation	Fractions	Geometry	Reading	Vocabulary	f	\N	Teacher well prepared	Not Matched	66	Partial Upto Date	Lacking	2	3	4	5	5	4	5	2	t	t	t	f	t	t	t	29	f	t	t	t	f	\N	Teacher dedication is commendable.	2026-09-11 08:02:50.12607+05:30	2026-09-11 08:02:50.12607+05:30
303	2	\N	2026-08-18	18	t	t	\N	Multiplication	Percentages	Reading	Vocabulary	t	\N	Some gaps in preparation	Matched	85	Upto Date	Lacking	2	5	2	3	2	5	2	3	t	t	t	t	f	f	t	22	t	t	f	t	t	\N	Academic performance is improving steadily.	2026-09-11 08:02:50.12607+05:30	2026-09-11 08:02:50.126071+05:30
304	3	\N	2024-02-16	18	t	f	Weather disruption	Basic Numbers	Algebra basics	Short sentences	Vocabulary	f	\N	Teacher well prepared	Matched	79	Upto Date	Sufficient	4	3	2	5	2	2	5	3	t	f	t	f	t	t	t	15	t	t	f	t	t	\N	Excellent classroom environment.	2026-09-11 08:02:50.126071+05:30	2026-09-11 08:02:50.126071+05:30
305	3	\N	2024-04-04	17	f	t	Exam preparation	Multiplication	Geometry	Reading	Essay writing	t	\N	Good preparation	Not Matched	97	Partial Upto Date	More than required	3	2	5	4	4	5	4	5	f	t	t	t	t	t	f	30	t	f	t	t	t	\N	Excellent classroom environment.	2026-09-11 08:02:50.126071+05:30	2026-09-11 08:02:50.126071+05:30
306	3	\N	2024-05-01	19	t	f	Festival week	Fractions	Geometry	Simple words	Essay writing	t	\N	Needs improvement in planning	Matched	97	Not Uptodate	More than required	2	4	5	2	4	3	2	4	t	t	t	f	f	t	f	13	t	f	t	f	f	\N	Academic performance is improving steadily.	2026-09-11 08:02:50.126071+05:30	2026-09-11 08:02:50.126071+05:30
307	3	\N	2024-06-23	14	t	f	Festival week	Basic Numbers	Percentages	Alphabets	Vocabulary	t	\N	Some gaps in preparation	Matched	69	Partial Upto Date	More than required	4	5	4	2	3	5	2	4	f	t	t	f	f	t	f	11	t	f	t	t	t	\N	Students are engaged and motivated.	2026-09-11 08:02:50.126072+05:30	2026-09-11 08:02:50.126072+05:30
308	3	\N	2024-08-07	24	f	t	Weather disruption	Basic Numbers	Geometry	Reading	Grammar	f	\N	Some gaps in preparation	Not Matched	100	Partial Upto Date	Sufficient	4	3	5	5	3	4	2	4	t	f	t	t	t	t	f	10	t	t	t	t	f	\N	Students are engaged and motivated.	2026-09-11 08:02:50.126072+05:30	2026-09-11 08:02:50.126072+05:30
309	3	\N	2024-10-08	16	f	f	Teacher absent	Multiplication	Geometry	Simple words	Essay writing	f	\N	Some gaps in preparation	Matched	57	Upto Date	Sufficient	4	3	2	2	3	2	4	3	t	t	t	t	t	t	t	23	t	t	t	t	t	\N	Excellent classroom environment.	2026-09-11 08:02:50.126072+05:30	2026-09-11 08:02:50.126072+05:30
310	3	\N	2024-11-21	31	t	f	Weather disruption	Basic Numbers	Algebra basics	Alphabets	Vocabulary	f	\N	Teacher well prepared	Matched	71	Not Uptodate	Lacking	2	2	4	3	2	3	4	4	t	t	t	t	t	f	t	28	t	f	t	t	f	\N	Students are engaged and motivated.	2026-09-11 08:02:50.126073+05:30	2026-09-11 08:02:50.126073+05:30
311	3	\N	2025-01-11	22	t	f	Exam preparation	Addition, Subtraction	Percentages	Reading	Essay writing	t	\N	Adequate material ready	Matched	83	Partial Upto Date	Sufficient	2	2	2	5	2	4	3	2	t	t	t	t	t	t	f	9	f	t	t	t	t	\N	Students are engaged and motivated.	2026-09-11 08:02:50.126073+05:30	2026-09-11 08:02:50.126073+05:30
312	3	\N	2025-02-24	13	t	t	\N	Fractions	Percentages	Alphabets	Essay writing	t	\N	Teacher well prepared	Matched	78	Not Uptodate	More than required	4	2	3	4	4	4	4	2	t	t	t	t	t	f	t	24	t	t	t	t	f	\N	Academic performance is improving steadily.	2026-09-11 08:02:50.126073+05:30	2026-09-11 08:02:50.126073+05:30
313	3	\N	2025-04-02	11	f	t	Festival week	Multiplication	Algebra basics	Alphabets	Essay writing	t	\N	Teacher well prepared	Not Matched	78	Partial Upto Date	Lacking	4	3	2	4	5	2	4	5	t	t	t	f	t	t	t	12	f	t	t	t	f	\N	Students are engaged and motivated.	2026-09-11 08:02:50.126073+05:30	2026-09-11 08:02:50.126074+05:30
314	3	\N	2025-05-26	17	t	t	\N	Fractions	Algebra basics	Reading	Grammar	t	\N	Teacher well prepared	Matched	95	Partial Upto Date	More than required	5	5	5	4	2	5	2	4	t	f	t	t	t	t	t	15	t	t	t	f	f	\N	Students are engaged and motivated.	2026-09-11 08:02:50.126074+05:30	2026-09-11 08:02:50.126074+05:30
315	3	\N	2025-07-01	26	t	t	\N	Addition, Subtraction	Geometry	Short sentences	Essay writing	t	\N	Needs improvement in planning	Matched	46	Upto Date	Lacking	3	3	3	2	3	5	5	5	t	f	t	f	t	f	f	12	t	t	t	f	t	\N	Need to focus more on English reading.	2026-09-11 08:02:50.126074+05:30	2026-09-11 08:02:50.126074+05:30
316	3	\N	2025-08-12	24	t	t	\N	Addition, Subtraction	Algebra basics	Short sentences	Essay writing	t	\N	Good preparation	Not Matched	69	Not Uptodate	More than required	2	5	3	4	5	3	2	5	t	f	t	t	t	t	t	30	t	t	t	t	f	\N	Need to focus more on English reading.	2026-09-11 08:02:50.126074+05:30	2026-09-11 08:02:50.126075+05:30
317	3	\N	2025-10-10	31	t	f	Teacher absent	Fractions	Algebra basics	Short sentences	Grammar	t	\N	Teacher well prepared	Not Matched	56	Not Uptodate	More than required	3	4	2	3	4	4	5	3	t	f	t	t	f	f	t	28	t	t	t	t	t	\N	Need to focus more on English reading.	2026-09-11 08:02:50.126075+05:30	2026-09-11 08:02:50.126075+05:30
318	3	\N	2025-11-23	17	f	t	Festival week	Multiplication	Algebra basics	Short sentences	Grammar	t	\N	Some gaps in preparation	Matched	82	Partial Upto Date	More than required	3	5	3	3	3	3	5	2	t	t	t	t	t	t	f	15	t	t	f	t	t	\N	Need to focus more on English reading.	2026-09-11 08:02:50.126075+05:30	2026-09-11 08:02:50.126075+05:30
319	3	\N	2026-01-04	24	t	t	\N	Basic Numbers	Percentages	Reading	Vocabulary	f	\N	Needs improvement in planning	Matched	95	Partial Upto Date	Sufficient	5	4	2	2	4	2	3	4	t	t	f	t	f	f	f	8	t	t	t	t	t	\N	Need to focus more on English reading.	2026-09-11 08:02:50.126075+05:30	2026-09-11 08:02:50.126076+05:30
320	3	\N	2026-01-29	13	t	t	\N	Fractions	Geometry	Simple words	Grammar	t	\N	Teacher well prepared	Matched	88	Not Uptodate	Lacking	5	2	2	2	4	3	3	5	t	t	t	t	t	f	f	10	t	f	t	t	t	\N	Teacher dedication is commendable.	2026-09-11 08:02:50.126076+05:30	2026-09-11 08:02:50.126076+05:30
321	3	\N	2026-03-14	29	t	t	\N	Fractions	Geometry	Reading	Comprehension	t	\N	Good preparation	Not Matched	44	Not Uptodate	More than required	2	5	5	2	5	4	4	2	t	t	t	t	t	t	f	12	t	t	f	t	f	\N	Teacher dedication is commendable.	2026-09-11 08:02:50.126076+05:30	2026-09-11 08:02:50.126076+05:30
322	3	\N	2026-05-02	14	t	t	\N	Addition, Subtraction	Decimals	Alphabets	Essay writing	t	\N	Needs improvement in planning	Matched	60	Partial Upto Date	More than required	5	5	4	2	3	4	4	2	f	t	t	t	f	t	f	18	f	t	t	f	f	\N	Academic performance is improving steadily.	2026-09-11 08:02:50.126076+05:30	2026-09-11 08:02:50.126077+05:30
323	3	\N	2026-06-17	23	t	t	\N	Multiplication	Percentages	Short sentences	Grammar	t	\N	Adequate material ready	Not Matched	68	Not Uptodate	More than required	5	3	5	4	5	2	4	5	t	f	f	t	t	t	t	8	t	t	f	t	t	\N	Students are engaged and motivated.	2026-09-11 08:02:50.126077+05:30	2026-09-11 08:02:50.126077+05:30
324	3	\N	2026-08-08	22	f	t	Teacher absent	Multiplication	Decimals	Short sentences	Essay writing	t	\N	Good preparation	Matched	73	Partial Upto Date	Lacking	4	4	3	2	2	3	5	5	f	t	f	t	t	t	f	14	t	f	t	f	f	\N	Overall good progress. Keep it up.	2026-09-11 08:02:50.126077+05:30	2026-09-11 08:02:50.126077+05:30
325	4	\N	2024-01-01	17	t	f	Weather disruption	Fractions	Algebra basics	Short sentences	Comprehension	t	\N	Some gaps in preparation	Not Matched	48	Not Uptodate	Lacking	2	3	3	3	4	2	2	2	t	t	t	t	f	t	t	23	f	t	t	t	t	\N	Academic performance is improving steadily.	2026-09-11 08:02:50.126077+05:30	2026-09-11 08:02:50.126077+05:30
326	4	\N	2024-02-08	24	f	t	Teacher absent	Addition, Subtraction	Geometry	Reading	Vocabulary	t	\N	Needs improvement in planning	Not Matched	78	Upto Date	Lacking	4	4	5	3	4	2	4	3	t	t	t	t	t	t	f	15	f	f	f	f	f	\N	Students are engaged and motivated.	2026-09-11 08:02:50.126078+05:30	2026-09-11 08:02:50.126078+05:30
327	4	\N	2024-03-30	26	f	t	Exam preparation	Basic Numbers	Percentages	Reading	Grammar	t	\N	Teacher well prepared	Not Matched	55	Upto Date	More than required	4	2	2	4	5	5	4	2	f	t	f	t	f	t	f	9	t	t	t	t	f	\N	Academic performance is improving steadily.	2026-09-11 08:02:50.126078+05:30	2026-09-11 08:02:50.126078+05:30
328	4	\N	2024-05-20	29	t	f	Teacher absent	Multiplication	Algebra basics	Reading	Essay writing	f	\N	Adequate material ready	Not Matched	88	Upto Date	Sufficient	5	2	2	2	3	4	5	5	t	f	t	f	t	t	f	26	t	f	t	t	f	\N	Attendance needs improvement.	2026-09-11 08:02:50.126078+05:30	2026-09-11 08:02:50.126078+05:30
329	4	\N	2024-06-20	31	f	t	Teacher absent	Basic Numbers	Percentages	Alphabets	Vocabulary	t	\N	Some gaps in preparation	Matched	86	Upto Date	More than required	5	3	5	3	3	2	2	3	t	t	t	t	t	f	f	9	t	t	t	f	f	\N	Excellent classroom environment.	2026-09-11 08:02:50.126079+05:30	2026-09-11 08:02:50.126079+05:30
330	4	\N	2024-07-24	24	t	f	Weather disruption	Fractions	Percentages	Reading	Comprehension	f	\N	Adequate material ready	Not Matched	54	Partial Upto Date	Lacking	3	5	4	5	4	4	4	2	t	t	f	t	t	f	t	17	t	f	t	f	f	\N	Teacher dedication is commendable.	2026-09-11 08:02:50.126079+05:30	2026-09-11 08:02:50.126079+05:30
331	4	\N	2024-09-04	27	t	t	\N	Fractions	Percentages	Simple words	Grammar	t	\N	Some gaps in preparation	Matched	55	Upto Date	More than required	3	3	2	2	5	4	5	2	t	t	f	f	t	t	f	23	t	f	t	t	t	\N	Academic performance is improving steadily.	2026-09-11 08:02:50.126079+05:30	2026-09-11 08:02:50.126079+05:30
332	4	\N	2024-10-27	27	t	t	\N	Addition, Subtraction	Geometry	Reading	Comprehension	f	\N	Good preparation	Not Matched	90	Partial Upto Date	Sufficient	4	2	2	4	2	4	4	5	f	t	t	f	f	t	t	11	t	t	t	t	t	\N	Teacher dedication is commendable.	2026-09-11 08:02:50.12608+05:30	2026-09-11 08:02:50.12608+05:30
333	4	\N	2024-11-27	31	t	t	\N	Multiplication	Geometry	Reading	Vocabulary	t	\N	Good preparation	Not Matched	82	Upto Date	Sufficient	3	5	4	3	2	4	5	3	t	t	t	t	t	t	f	30	t	t	t	t	f	\N	Teacher dedication is commendable.	2026-09-11 08:02:50.12608+05:30	2026-09-11 08:02:50.12608+05:30
334	4	\N	2025-01-15	19	t	f	Weather disruption	Multiplication	Geometry	Simple words	Vocabulary	t	\N	Some gaps in preparation	Not Matched	66	Not Uptodate	More than required	5	3	3	2	5	4	2	2	t	t	t	t	t	t	f	11	t	t	t	f	f	\N	Academic performance is improving steadily.	2026-09-11 08:02:50.12608+05:30	2026-09-11 08:02:50.12608+05:30
335	4	\N	2025-02-28	23	t	t	\N	Basic Numbers	Algebra basics	Reading	Essay writing	t	\N	Teacher well prepared	Not Matched	92	Upto Date	More than required	3	2	2	5	4	2	2	2	f	t	t	t	t	t	f	19	f	t	f	f	f	\N	Overall good progress. Keep it up.	2026-09-11 08:02:50.126081+05:30	2026-09-11 08:02:50.126081+05:30
336	4	\N	2025-03-20	27	t	t	\N	Multiplication	Percentages	Alphabets	Comprehension	f	\N	Teacher well prepared	Matched	86	Upto Date	Sufficient	2	4	5	5	5	3	3	5	t	t	f	t	t	f	f	27	f	f	t	t	t	\N	Excellent classroom environment.	2026-09-11 08:02:50.126081+05:30	2026-09-11 08:02:50.126081+05:30
337	4	\N	2025-05-13	32	t	t	\N	Addition, Subtraction	Geometry	Alphabets	Vocabulary	t	\N	Some gaps in preparation	Matched	88	Upto Date	Sufficient	4	3	4	4	3	4	3	3	t	t	t	t	t	t	f	25	t	f	f	t	f	\N	Teacher dedication is commendable.	2026-09-11 08:02:50.126081+05:30	2026-09-11 08:02:50.126081+05:30
338	4	\N	2025-07-06	22	t	t	\N	Multiplication	Decimals	Simple words	Comprehension	t	\N	Needs improvement in planning	Not Matched	98	Upto Date	More than required	5	5	3	5	3	4	3	4	t	f	f	t	t	t	f	20	t	t	f	t	t	\N	Attendance needs improvement.	2026-09-11 08:02:50.126082+05:30	2026-09-11 08:02:50.126082+05:30
339	4	\N	2025-08-20	19	t	f	Teacher absent	Multiplication	Geometry	Alphabets	Vocabulary	f	\N	Some gaps in preparation	Matched	65	Upto Date	More than required	4	4	5	5	4	4	4	4	t	t	t	f	t	f	t	19	t	t	f	t	t	\N	Need to focus more on English reading.	2026-09-11 08:02:50.126082+05:30	2026-09-11 08:02:50.126082+05:30
340	4	\N	2025-09-17	33	t	t	\N	Basic Numbers	Percentages	Simple words	Comprehension	t	\N	Teacher well prepared	Matched	71	Not Uptodate	More than required	4	4	5	5	5	3	4	3	t	t	t	f	f	f	t	10	f	t	f	t	t	\N	Overall good progress. Keep it up.	2026-09-11 08:02:50.126082+05:30	2026-09-11 08:02:50.126082+05:30
341	4	\N	2025-11-17	26	t	t	\N	Basic Numbers	Percentages	Alphabets	Vocabulary	t	\N	Good preparation	Matched	74	Not Uptodate	Lacking	2	2	4	4	2	5	3	2	f	t	t	t	t	t	f	10	t	t	t	f	t	\N	Need to focus more on English reading.	2026-09-11 08:02:50.126083+05:30	2026-09-11 08:02:50.126083+05:30
342	4	\N	2025-12-18	30	t	f	Teacher absent	Addition, Subtraction	Decimals	Reading	Vocabulary	t	\N	Good preparation	Matched	84	Upto Date	Sufficient	5	5	4	2	2	3	3	5	t	f	t	t	t	t	t	18	t	t	t	f	f	\N	Overall good progress. Keep it up.	2026-09-11 08:02:50.126083+05:30	2026-09-11 08:02:50.126083+05:30
343	4	\N	2026-02-07	28	t	t	\N	Basic Numbers	Percentages	Reading	Comprehension	f	\N	Good preparation	Not Matched	43	Upto Date	Lacking	3	2	4	5	4	2	4	5	t	t	f	t	t	t	t	27	t	t	t	t	f	\N	Teacher dedication is commendable.	2026-09-11 08:02:50.126083+05:30	2026-09-11 08:02:50.126083+05:30
344	4	\N	2026-03-13	22	f	t	Weather disruption	Fractions	Algebra basics	Alphabets	Grammar	f	\N	Teacher well prepared	Not Matched	88	Partial Upto Date	Sufficient	3	2	3	5	5	5	2	2	t	t	t	f	f	t	f	20	f	t	t	f	t	\N	Excellent classroom environment.	2026-09-11 08:02:50.126083+05:30	2026-09-11 08:02:50.126084+05:30
345	4	\N	2026-04-22	15	t	t	\N	Multiplication	Percentages	Short sentences	Essay writing	t	\N	Good preparation	Matched	67	Partial Upto Date	Lacking	4	5	2	4	4	3	5	3	t	t	t	t	f	t	f	22	t	f	f	f	t	\N	Need to focus more on English reading.	2026-09-11 08:02:50.126084+05:30	2026-09-11 08:02:50.126084+05:30
346	4	\N	2026-06-21	16	t	f	Exam preparation	Fractions	Geometry	Reading	Essay writing	t	\N	Teacher well prepared	Matched	60	Partial Upto Date	Lacking	5	4	2	3	3	2	5	3	t	t	t	f	f	t	f	12	t	t	t	t	f	\N	Overall good progress. Keep it up.	2026-09-11 08:02:50.126084+05:30	2026-09-11 08:02:50.126084+05:30
347	4	\N	2026-07-14	28	t	t	\N	Basic Numbers	Decimals	Alphabets	Essay writing	t	\N	Some gaps in preparation	Matched	46	Upto Date	More than required	4	3	2	5	4	5	2	2	t	t	t	t	t	t	f	20	t	t	t	t	t	\N	Attendance needs improvement.	2026-09-11 08:02:50.126084+05:30	2026-09-11 08:02:50.126085+05:30
348	4	\N	2026-08-28	12	t	t	\N	Addition, Subtraction	Geometry	Short sentences	Essay writing	t	\N	Needs improvement in planning	Not Matched	62	Partial Upto Date	Sufficient	5	5	4	2	4	2	2	2	f	t	t	t	f	t	t	25	t	t	f	t	f	\N	Teacher dedication is commendable.	2026-09-11 08:02:50.126085+05:30	2026-09-11 08:02:50.126085+05:30
349	5	\N	2024-02-20	23	t	t	\N	Multiplication	Decimals	Reading	Comprehension	t	\N	Some gaps in preparation	Matched	75	Upto Date	Lacking	4	3	3	4	5	2	4	2	t	t	t	t	t	t	f	21	t	t	t	t	t	\N	Need to focus more on English reading.	2026-09-11 08:02:50.126085+05:30	2026-09-11 08:02:50.126085+05:30
350	5	\N	2024-03-31	19	t	t	\N	Multiplication	Decimals	Reading	Grammar	t	\N	Adequate material ready	Not Matched	74	Upto Date	More than required	5	3	5	2	3	4	2	5	t	f	t	f	t	f	t	26	t	f	t	t	t	\N	Academic performance is improving steadily.	2026-09-11 08:02:50.126085+05:30	2026-09-11 08:02:50.126086+05:30
351	5	\N	2024-05-12	11	t	t	\N	Fractions	Percentages	Simple words	Essay writing	f	\N	Adequate material ready	Not Matched	76	Partial Upto Date	More than required	2	3	5	2	4	3	3	3	t	t	t	f	t	t	f	28	t	t	t	f	t	\N	Attendance needs improvement.	2026-09-11 08:02:50.126086+05:30	2026-09-11 08:02:50.126086+05:30
352	5	\N	2024-06-17	21	t	t	\N	Basic Numbers	Decimals	Short sentences	Grammar	f	\N	Good preparation	Not Matched	80	Not Uptodate	More than required	4	2	5	3	5	3	5	4	t	t	t	t	f	f	t	9	t	f	t	t	t	\N	Attendance needs improvement.	2026-09-11 08:02:50.126086+05:30	2026-09-11 08:02:50.126086+05:30
353	5	\N	2024-08-02	23	t	f	Festival week	Multiplication	Percentages	Simple words	Essay writing	t	\N	Adequate material ready	Not Matched	45	Partial Upto Date	More than required	3	2	5	4	3	5	2	2	t	t	t	t	t	t	f	11	f	t	t	t	f	\N	Overall good progress. Keep it up.	2026-09-11 08:02:50.126086+05:30	2026-09-11 08:02:50.126086+05:30
354	5	\N	2024-08-31	20	t	t	\N	Fractions	Percentages	Simple words	Vocabulary	f	\N	Needs improvement in planning	Matched	44	Not Uptodate	More than required	2	3	5	4	3	3	5	5	f	t	t	f	t	t	f	18	f	t	t	t	f	\N	Academic performance is improving steadily.	2026-09-11 08:02:50.126087+05:30	2026-09-11 08:02:50.126087+05:30
355	5	\N	2024-10-13	31	f	t	Weather disruption	Multiplication	Geometry	Reading	Essay writing	t	\N	Needs improvement in planning	Not Matched	64	Upto Date	Sufficient	5	2	2	4	4	3	5	5	t	t	f	f	f	t	t	8	t	t	t	f	f	\N	Teacher dedication is commendable.	2026-09-11 08:02:50.126087+05:30	2026-09-11 08:02:50.126087+05:30
356	5	\N	2024-11-29	23	t	f	Exam preparation	Addition, Subtraction	Geometry	Short sentences	Grammar	t	\N	Some gaps in preparation	Matched	91	Upto Date	More than required	4	5	2	4	5	3	2	3	t	t	t	t	t	t	t	11	t	t	t	t	f	\N	Excellent classroom environment.	2026-09-11 08:02:50.126087+05:30	2026-09-11 08:02:50.126087+05:30
357	5	\N	2025-01-05	18	t	f	Festival week	Fractions	Geometry	Short sentences	Grammar	f	\N	Good preparation	Not Matched	91	Partial Upto Date	Lacking	2	4	2	5	5	4	2	5	f	t	t	f	f	t	t	15	t	t	f	t	t	\N	Attendance needs improvement.	2026-09-11 08:02:50.126088+05:30	2026-09-11 08:02:50.126088+05:30
358	5	\N	2025-02-08	15	t	f	Teacher absent	Basic Numbers	Geometry	Short sentences	Comprehension	t	\N	Adequate material ready	Not Matched	92	Upto Date	More than required	4	2	2	3	3	2	5	2	f	f	f	t	t	t	f	14	t	f	t	t	f	\N	Excellent classroom environment.	2026-09-11 08:02:50.126088+05:30	2026-09-11 08:02:50.126088+05:30
359	5	\N	2025-03-20	34	f	f	Festival week	Multiplication	Geometry	Alphabets	Vocabulary	t	\N	Some gaps in preparation	Not Matched	80	Not Uptodate	Sufficient	4	2	5	4	2	3	3	5	t	t	f	t	t	f	f	30	f	t	t	t	t	\N	Teacher dedication is commendable.	2026-09-11 08:02:50.126088+05:30	2026-09-11 08:02:50.126088+05:30
360	5	\N	2025-05-05	28	f	t	Teacher absent	Basic Numbers	Geometry	Simple words	Essay writing	t	\N	Adequate material ready	Not Matched	84	Not Uptodate	Lacking	4	5	4	3	2	3	3	2	t	t	t	t	t	f	t	22	t	t	t	t	f	\N	Academic performance is improving steadily.	2026-09-11 08:02:50.126089+05:30	2026-09-11 08:02:50.126089+05:30
361	5	\N	2025-06-29	16	t	t	\N	Fractions	Geometry	Alphabets	Comprehension	f	\N	Teacher well prepared	Matched	83	Partial Upto Date	Lacking	3	2	5	5	3	2	5	2	f	t	t	f	f	t	f	19	t	f	t	t	t	\N	Overall good progress. Keep it up.	2026-09-11 08:02:50.126089+05:30	2026-09-11 08:02:50.126089+05:30
362	5	\N	2025-08-17	30	f	t	Exam preparation	Multiplication	Algebra basics	Short sentences	Grammar	t	\N	Teacher well prepared	Matched	50	Not Uptodate	Lacking	5	5	2	5	5	3	4	3	f	t	t	t	t	t	f	23	t	t	t	t	t	\N	Attendance needs improvement.	2026-09-11 08:02:50.126089+05:30	2026-09-11 08:02:50.126089+05:30
363	5	\N	2025-10-03	26	t	f	Festival week	Addition, Subtraction	Decimals	Short sentences	Vocabulary	t	\N	Teacher well prepared	Not Matched	98	Not Uptodate	More than required	4	5	4	3	2	4	3	2	f	f	t	f	t	f	t	13	t	t	t	f	t	\N	Academic performance is improving steadily.	2026-09-11 08:02:50.126089+05:30	2026-09-11 08:02:50.12609+05:30
364	5	\N	2025-11-18	35	f	t	Exam preparation	Fractions	Geometry	Simple words	Comprehension	t	\N	Adequate material ready	Matched	85	Not Uptodate	Lacking	3	3	5	4	3	5	2	2	t	t	t	t	t	t	t	18	t	f	f	t	t	\N	Students are engaged and motivated.	2026-09-11 08:02:50.12609+05:30	2026-09-11 08:02:50.12609+05:30
365	5	\N	2025-12-19	34	t	f	Teacher absent	Fractions	Algebra basics	Short sentences	Vocabulary	t	\N	Adequate material ready	Not Matched	60	Upto Date	Sufficient	5	5	4	3	4	3	3	5	t	t	t	t	f	f	f	26	t	t	f	f	t	\N	Teacher dedication is commendable.	2026-09-11 08:02:50.12609+05:30	2026-09-11 08:02:50.12609+05:30
366	5	\N	2026-02-06	14	t	f	Weather disruption	Addition, Subtraction	Geometry	Short sentences	Essay writing	t	\N	Good preparation	Not Matched	68	Upto Date	Lacking	3	3	2	4	4	2	2	2	t	t	f	f	t	t	f	11	f	f	t	f	t	\N	Students are engaged and motivated.	2026-09-11 08:02:50.12609+05:30	2026-09-11 08:02:50.126091+05:30
367	5	\N	2026-03-13	11	t	f	Weather disruption	Addition, Subtraction	Percentages	Short sentences	Grammar	t	\N	Needs improvement in planning	Not Matched	50	Not Uptodate	Sufficient	2	4	5	2	5	3	5	3	t	t	f	t	t	f	f	29	t	t	t	t	f	\N	Students are engaged and motivated.	2026-09-11 08:02:50.126091+05:30	2026-09-11 08:02:50.126091+05:30
368	5	\N	2026-04-14	12	t	t	\N	Fractions	Decimals	Simple words	Grammar	t	\N	Needs improvement in planning	Not Matched	45	Partial Upto Date	Sufficient	4	5	5	5	4	2	5	3	t	t	t	t	t	t	f	26	t	f	t	t	f	\N	Academic performance is improving steadily.	2026-09-11 08:02:50.126091+05:30	2026-09-11 08:02:50.126091+05:30
369	5	\N	2026-05-28	28	t	f	Festival week	Addition, Subtraction	Decimals	Reading	Vocabulary	t	\N	Needs improvement in planning	Not Matched	59	Upto Date	Lacking	2	3	2	5	3	3	3	3	t	t	f	t	f	t	f	18	f	f	t	t	f	\N	Excellent classroom environment.	2026-09-11 08:02:50.126091+05:30	2026-09-11 08:02:50.126091+05:30
370	6	\N	2024-01-01	24	t	f	Weather disruption	Fractions	Decimals	Alphabets	Comprehension	t	\N	Teacher well prepared	Not Matched	88	Not Uptodate	Lacking	2	3	2	4	5	3	2	3	t	f	f	t	t	f	t	16	t	t	t	f	t	\N	Students are engaged and motivated.	2026-09-11 08:02:50.126092+05:30	2026-09-11 08:02:50.126092+05:30
371	6	\N	2024-02-19	15	t	t	\N	Basic Numbers	Percentages	Short sentences	Comprehension	f	\N	Adequate material ready	Matched	58	Upto Date	Lacking	2	3	3	3	3	3	4	5	t	f	f	t	t	t	t	27	f	t	t	f	f	\N	Attendance needs improvement.	2026-09-11 08:02:50.126092+05:30	2026-09-11 08:02:50.126092+05:30
372	6	\N	2024-03-23	24	f	f	Weather disruption	Multiplication	Decimals	Short sentences	Vocabulary	t	\N	Good preparation	Not Matched	75	Not Uptodate	More than required	4	4	2	5	2	4	4	4	f	t	t	f	t	t	t	9	f	f	t	t	t	\N	Teacher dedication is commendable.	2026-09-11 08:02:50.126092+05:30	2026-09-11 08:02:50.126092+05:30
373	6	\N	2024-05-13	19	t	t	\N	Fractions	Decimals	Reading	Vocabulary	t	\N	Some gaps in preparation	Matched	61	Not Uptodate	More than required	3	5	4	4	3	3	4	2	t	t	t	t	f	f	f	28	t	t	t	t	f	\N	Need to focus more on English reading.	2026-09-11 08:02:50.126093+05:30	2026-09-11 08:02:50.126093+05:30
374	6	\N	2024-07-01	13	t	t	\N	Basic Numbers	Algebra basics	Alphabets	Vocabulary	f	\N	Some gaps in preparation	Matched	95	Not Uptodate	Lacking	4	5	2	3	3	3	4	5	f	f	f	t	f	t	t	23	t	f	t	t	f	\N	Need to focus more on English reading.	2026-09-11 08:02:50.126093+05:30	2026-09-11 08:02:50.126093+05:30
375	6	\N	2024-08-23	28	t	f	Festival week	Basic Numbers	Algebra basics	Simple words	Vocabulary	t	\N	Teacher well prepared	Not Matched	70	Partial Upto Date	Sufficient	2	3	4	2	4	3	2	2	t	t	t	t	t	t	f	13	t	t	f	t	f	\N	Attendance needs improvement.	2026-09-11 08:02:50.126093+05:30	2026-09-11 08:02:50.126093+05:30
376	6	\N	2024-09-15	20	f	f	Exam preparation	Fractions	Geometry	Simple words	Vocabulary	t	\N	Needs improvement in planning	Matched	53	Not Uptodate	Sufficient	3	2	4	2	5	4	2	2	t	t	t	t	t	t	f	23	t	t	t	t	f	\N	Teacher dedication is commendable.	2026-09-11 08:02:50.126094+05:30	2026-09-11 08:02:50.126094+05:30
377	6	\N	2024-10-29	29	t	t	\N	Multiplication	Decimals	Alphabets	Grammar	t	\N	Good preparation	Not Matched	52	Not Uptodate	Sufficient	4	3	4	5	4	3	2	5	f	t	t	t	t	t	t	26	t	t	t	t	t	\N	Need to focus more on English reading.	2026-09-11 08:02:50.126094+05:30	2026-09-11 08:02:50.126094+05:30
378	6	\N	2024-12-18	19	t	t	\N	Fractions	Decimals	Alphabets	Grammar	f	\N	Good preparation	Not Matched	63	Not Uptodate	Lacking	5	2	2	2	2	3	3	4	t	t	t	f	t	f	t	11	t	f	t	t	f	\N	Academic performance is improving steadily.	2026-09-11 08:02:50.126094+05:30	2026-09-11 08:02:50.126094+05:30
379	6	\N	2025-01-29	15	t	f	Teacher absent	Multiplication	Algebra basics	Simple words	Grammar	t	\N	Some gaps in preparation	Not Matched	91	Not Uptodate	More than required	5	3	5	4	2	3	5	5	t	t	t	t	t	t	t	29	f	t	t	t	f	\N	Teacher dedication is commendable.	2026-09-11 08:02:50.126094+05:30	2026-09-11 08:02:50.126095+05:30
380	6	\N	2025-03-26	31	t	t	\N	Basic Numbers	Geometry	Alphabets	Grammar	t	\N	Needs improvement in planning	Not Matched	94	Partial Upto Date	Sufficient	2	5	4	3	4	4	2	3	t	t	f	t	t	t	t	23	t	t	t	t	t	\N	Attendance needs improvement.	2026-09-11 08:02:50.126095+05:30	2026-09-11 08:02:50.126095+05:30
381	6	\N	2025-04-28	10	t	t	\N	Addition, Subtraction	Percentages	Simple words	Vocabulary	f	\N	Adequate material ready	Matched	92	Upto Date	Lacking	4	5	4	5	2	2	3	2	t	f	f	t	t	t	t	13	t	f	t	t	f	\N	Excellent classroom environment.	2026-09-11 08:02:50.126095+05:30	2026-09-11 08:02:50.126095+05:30
382	6	\N	2025-06-14	22	t	t	\N	Multiplication	Decimals	Simple words	Essay writing	t	\N	Teacher well prepared	Matched	99	Not Uptodate	More than required	2	5	5	3	5	2	2	5	f	t	t	f	t	t	t	11	t	t	f	t	f	\N	Attendance needs improvement.	2026-09-11 08:02:50.126095+05:30	2026-09-11 08:02:50.126096+05:30
383	6	\N	2025-07-27	34	f	f	Festival week	Fractions	Decimals	Short sentences	Essay writing	t	\N	Needs improvement in planning	Matched	66	Not Uptodate	More than required	4	4	3	3	3	4	4	3	f	t	f	t	t	t	t	19	t	t	f	t	f	\N	Academic performance is improving steadily.	2026-09-11 08:02:50.126096+05:30	2026-09-11 08:02:50.126096+05:30
384	6	\N	2025-09-09	13	t	t	\N	Addition, Subtraction	Decimals	Simple words	Grammar	t	\N	Needs improvement in planning	Not Matched	88	Upto Date	Lacking	4	3	2	4	3	2	4	5	t	f	t	f	t	t	t	24	f	f	t	t	f	\N	Attendance needs improvement.	2026-09-11 08:02:50.126096+05:30	2026-09-11 08:02:50.126096+05:30
385	6	\N	2025-11-04	31	t	f	Weather disruption	Addition, Subtraction	Algebra basics	Short sentences	Comprehension	t	\N	Teacher well prepared	Matched	98	Not Uptodate	More than required	4	3	3	4	5	3	2	3	f	t	t	t	t	t	t	26	f	t	t	f	t	\N	Students are engaged and motivated.	2026-09-11 08:02:50.126096+05:30	2026-09-11 08:02:50.126096+05:30
386	6	\N	2025-12-07	34	f	t	Weather disruption	Basic Numbers	Percentages	Alphabets	Essay writing	t	\N	Needs improvement in planning	Matched	90	Not Uptodate	Sufficient	5	5	2	4	3	3	4	4	t	t	f	t	f	f	t	11	t	t	f	t	t	\N	Overall good progress. Keep it up.	2026-09-11 08:02:50.126097+05:30	2026-09-11 08:02:50.126097+05:30
387	6	\N	2026-02-02	35	t	t	\N	Addition, Subtraction	Decimals	Short sentences	Essay writing	t	\N	Some gaps in preparation	Not Matched	72	Not Uptodate	Lacking	5	2	4	3	4	2	2	3	f	f	t	t	t	t	t	29	t	t	t	t	f	\N	Teacher dedication is commendable.	2026-09-11 08:02:50.126097+05:30	2026-09-11 08:02:50.126097+05:30
388	6	\N	2026-03-12	31	f	t	Festival week	Addition, Subtraction	Decimals	Short sentences	Grammar	t	\N	Good preparation	Matched	90	Partial Upto Date	More than required	2	3	4	5	5	5	5	5	t	t	t	t	t	t	t	30	f	t	t	t	f	\N	Excellent classroom environment.	2026-09-11 08:02:50.126097+05:30	2026-09-11 08:02:50.126097+05:30
389	6	\N	2026-05-05	24	t	f	Exam preparation	Basic Numbers	Algebra basics	Reading	Comprehension	t	\N	Needs improvement in planning	Not Matched	90	Not Uptodate	Lacking	3	4	4	2	3	2	2	2	t	t	t	t	t	t	f	14	t	t	t	t	t	\N	Excellent classroom environment.	2026-09-11 08:02:50.126098+05:30	2026-09-11 08:02:50.126098+05:30
390	6	\N	2026-06-17	15	f	t	Teacher absent	Basic Numbers	Algebra basics	Short sentences	Grammar	t	\N	Needs improvement in planning	Not Matched	100	Partial Upto Date	Lacking	3	3	2	4	2	3	4	5	t	t	t	t	t	t	f	21	t	t	f	t	f	\N	Need to focus more on English reading.	2026-09-11 08:02:50.126098+05:30	2026-09-11 08:02:50.126098+05:30
391	6	\N	2026-08-01	33	f	t	Weather disruption	Basic Numbers	Decimals	Reading	Essay writing	f	\N	Teacher well prepared	Matched	51	Not Uptodate	More than required	2	4	3	3	4	2	2	2	f	t	f	t	f	t	t	25	t	f	t	t	t	\N	Need to focus more on English reading.	2026-09-11 08:02:50.126098+05:30	2026-09-11 08:02:50.126098+05:30
392	7	\N	2024-01-03	17	t	t	\N	Basic Numbers	Percentages	Short sentences	Vocabulary	f	\N	Some gaps in preparation	Matched	72	Upto Date	Lacking	3	3	2	4	3	3	3	3	t	t	t	t	f	t	f	29	t	t	t	f	t	\N	Students are engaged and motivated.	2026-09-11 08:02:50.126099+05:30	2026-09-11 08:02:50.126099+05:30
393	7	\N	2024-02-20	15	t	t	\N	Multiplication	Algebra basics	Simple words	Grammar	t	\N	Needs improvement in planning	Not Matched	78	Not Uptodate	More than required	2	4	2	3	5	5	5	3	t	t	t	t	f	t	f	13	t	t	t	t	t	\N	Attendance needs improvement.	2026-09-11 08:02:50.126099+05:30	2026-09-11 08:02:50.126099+05:30
394	7	\N	2024-03-21	16	t	t	\N	Basic Numbers	Geometry	Alphabets	Comprehension	t	\N	Some gaps in preparation	Matched	96	Not Uptodate	More than required	2	2	5	3	2	5	5	4	f	t	t	f	t	f	f	26	f	f	f	t	f	\N	Students are engaged and motivated.	2026-09-11 08:02:50.126099+05:30	2026-09-11 08:02:50.126099+05:30
395	7	\N	2024-05-21	12	t	f	Weather disruption	Basic Numbers	Percentages	Simple words	Grammar	t	\N	Good preparation	Matched	73	Upto Date	Lacking	3	4	5	4	2	3	5	4	t	t	t	t	f	t	t	21	t	t	t	t	f	\N	Need to focus more on English reading.	2026-09-11 08:02:50.126099+05:30	2026-09-11 08:02:50.1261+05:30
396	7	\N	2024-06-23	34	f	t	Exam preparation	Multiplication	Algebra basics	Simple words	Vocabulary	f	\N	Needs improvement in planning	Matched	53	Not Uptodate	Lacking	4	2	3	5	2	2	3	5	f	t	t	t	t	t	f	20	t	t	t	t	t	\N	Teacher dedication is commendable.	2026-09-11 08:02:50.1261+05:30	2026-09-11 08:02:50.1261+05:30
397	7	\N	2024-08-12	31	t	t	\N	Fractions	Geometry	Alphabets	Comprehension	t	\N	Good preparation	Not Matched	55	Not Uptodate	Sufficient	3	2	4	5	4	5	5	3	t	t	t	t	t	f	f	19	f	t	t	t	f	\N	Excellent classroom environment.	2026-09-11 08:02:50.1261+05:30	2026-09-11 08:02:50.1261+05:30
398	7	\N	2024-10-26	26	t	t	\N	Addition, Subtraction	Algebra basics	Short sentences	Essay writing	f	\N	Some gaps in preparation	Not Matched	96	Not Uptodate	More than required	4	5	5	5	3	4	5	5	f	f	t	t	t	f	t	29	t	f	t	t	t	\N	Teacher dedication is commendable.	2026-09-11 08:02:50.1261+05:30	2026-09-11 08:02:50.126101+05:30
399	7	\N	2024-12-02	12	f	t	Exam preparation	Fractions	Algebra basics	Simple words	Vocabulary	t	\N	Needs improvement in planning	Not Matched	51	Not Uptodate	More than required	3	5	3	3	3	4	3	3	t	t	t	t	t	f	f	27	t	f	f	f	f	\N	Excellent classroom environment.	2026-09-11 08:02:50.126101+05:30	2026-09-11 08:02:50.126101+05:30
400	7	\N	2025-01-02	28	t	f	Weather disruption	Basic Numbers	Geometry	Short sentences	Vocabulary	t	\N	Some gaps in preparation	Matched	43	Not Uptodate	Lacking	5	2	4	5	3	5	2	5	t	t	t	t	t	t	f	13	t	t	t	t	f	\N	Students are engaged and motivated.	2026-09-11 08:02:50.126101+05:30	2026-09-11 08:02:50.126101+05:30
401	7	\N	2025-02-20	32	t	t	\N	Fractions	Percentages	Reading	Essay writing	t	\N	Some gaps in preparation	Matched	76	Not Uptodate	Sufficient	2	4	3	5	5	3	3	3	t	t	t	t	f	t	f	23	t	t	t	t	t	\N	Overall good progress. Keep it up.	2026-09-11 08:02:50.126101+05:30	2026-09-11 08:02:50.126102+05:30
402	7	\N	2025-03-24	30	t	t	\N	Addition, Subtraction	Decimals	Short sentences	Essay writing	t	\N	Some gaps in preparation	Not Matched	62	Upto Date	Lacking	2	4	3	3	4	4	4	5	f	t	t	t	t	f	t	28	f	t	t	t	t	\N	Overall good progress. Keep it up.	2026-09-11 08:02:50.126102+05:30	2026-09-11 08:02:50.126102+05:30
403	7	\N	2025-05-19	20	t	t	\N	Fractions	Percentages	Reading	Essay writing	f	\N	Adequate material ready	Not Matched	66	Upto Date	Sufficient	2	3	3	4	2	3	3	5	t	t	f	t	t	t	t	11	t	t	t	f	f	\N	Students are engaged and motivated.	2026-09-11 08:02:50.126102+05:30	2026-09-11 08:02:50.126102+05:30
404	7	\N	2025-06-17	30	t	t	\N	Multiplication	Geometry	Simple words	Grammar	t	\N	Adequate material ready	Not Matched	95	Partial Upto Date	Lacking	4	5	3	3	5	5	4	4	t	t	t	t	t	t	t	8	t	f	t	t	t	\N	Teacher dedication is commendable.	2026-09-11 08:02:50.126102+05:30	2026-09-11 08:02:50.126103+05:30
405	7	\N	2025-08-08	25	f	f	Weather disruption	Addition, Subtraction	Decimals	Short sentences	Comprehension	f	\N	Some gaps in preparation	Not Matched	52	Partial Upto Date	More than required	5	5	3	3	5	5	3	4	t	t	t	f	t	t	f	17	t	t	t	t	t	\N	Students are engaged and motivated.	2026-09-11 08:02:50.126103+05:30	2026-09-11 08:02:50.126103+05:30
406	7	\N	2025-09-09	24	t	t	\N	Basic Numbers	Percentages	Reading	Comprehension	t	\N	Needs improvement in planning	Matched	74	Upto Date	Sufficient	2	4	4	3	5	2	3	2	t	t	t	t	f	f	f	30	f	t	f	f	t	\N	Need to focus more on English reading.	2026-09-11 08:02:50.126103+05:30	2026-09-11 08:02:50.126103+05:30
407	7	\N	2025-11-04	25	f	t	Festival week	Multiplication	Percentages	Reading	Grammar	t	\N	Needs improvement in planning	Not Matched	89	Partial Upto Date	Sufficient	2	3	5	2	3	5	5	4	f	t	t	t	t	t	f	28	t	t	t	t	t	\N	Students are engaged and motivated.	2026-09-11 08:02:50.126103+05:30	2026-09-11 08:02:50.126103+05:30
408	7	\N	2025-12-16	15	t	t	\N	Fractions	Algebra basics	Reading	Comprehension	t	\N	Good preparation	Not Matched	84	Not Uptodate	Sufficient	4	2	3	3	5	2	4	2	t	t	t	f	t	t	f	22	t	t	t	t	f	\N	Overall good progress. Keep it up.	2026-09-11 08:02:50.126104+05:30	2026-09-11 08:02:50.126104+05:30
409	7	\N	2026-02-06	19	t	t	\N	Basic Numbers	Geometry	Simple words	Essay writing	t	\N	Teacher well prepared	Not Matched	95	Not Uptodate	More than required	3	2	3	5	4	4	4	5	t	t	t	t	t	f	t	18	t	t	t	t	f	\N	Academic performance is improving steadily.	2026-09-11 08:02:50.126104+05:30	2026-09-11 08:02:50.126104+05:30
410	7	\N	2026-03-01	20	t	t	\N	Basic Numbers	Percentages	Alphabets	Grammar	t	\N	Good preparation	Matched	93	Upto Date	Sufficient	2	3	2	5	3	2	2	5	t	t	t	t	t	t	t	8	f	t	t	f	t	\N	Attendance needs improvement.	2026-09-11 08:02:50.126104+05:30	2026-09-11 08:02:50.126104+05:30
411	7	\N	2026-04-17	27	f	t	Exam preparation	Fractions	Algebra basics	Short sentences	Grammar	t	\N	Adequate material ready	Matched	100	Upto Date	More than required	2	2	3	5	3	3	3	3	t	t	t	f	t	t	f	11	t	t	t	t	t	\N	Excellent classroom environment.	2026-09-11 08:02:50.126105+05:30	2026-09-11 08:02:50.126105+05:30
412	7	\N	2026-06-04	21	f	t	Weather disruption	Fractions	Percentages	Reading	Vocabulary	f	\N	Adequate material ready	Matched	76	Not Uptodate	Sufficient	5	4	4	5	5	5	2	2	f	t	t	f	t	t	t	14	f	t	f	t	f	\N	Excellent classroom environment.	2026-09-11 08:02:50.126105+05:30	2026-09-11 08:02:50.126105+05:30
413	7	\N	2026-07-18	28	t	t	\N	Multiplication	Algebra basics	Alphabets	Vocabulary	t	\N	Needs improvement in planning	Not Matched	63	Not Uptodate	Sufficient	3	4	4	2	5	3	2	4	f	t	f	t	t	f	f	9	t	t	t	t	f	\N	Need to focus more on English reading.	2026-09-11 08:02:50.126105+05:30	2026-09-11 08:02:50.126105+05:30
414	7	\N	2026-09-02	13	f	t	Festival week	Addition, Subtraction	Decimals	Alphabets	Essay writing	t	\N	Adequate material ready	Matched	60	Not Uptodate	More than required	3	3	2	5	5	2	3	5	t	t	t	t	t	t	f	16	t	t	f	t	t	\N	Attendance needs improvement.	2026-09-11 08:02:50.126105+05:30	2026-09-11 08:02:50.126106+05:30
415	8	\N	2024-01-08	33	t	t	\N	Multiplication	Geometry	Short sentences	Vocabulary	t	\N	Needs improvement in planning	Matched	64	Not Uptodate	More than required	2	4	3	2	4	3	4	2	t	f	t	t	t	f	f	11	t	f	t	t	f	\N	Excellent classroom environment.	2026-09-11 08:02:50.126106+05:30	2026-09-11 08:02:50.126106+05:30
416	8	\N	2024-02-16	20	f	t	Exam preparation	Addition, Subtraction	Geometry	Simple words	Vocabulary	t	\N	Good preparation	Matched	55	Not Uptodate	Lacking	4	5	5	3	2	4	4	4	t	t	f	t	f	t	f	8	f	f	t	t	f	\N	Teacher dedication is commendable.	2026-09-11 08:02:50.126106+05:30	2026-09-11 08:02:50.126106+05:30
417	8	\N	2024-04-08	26	t	t	\N	Multiplication	Decimals	Simple words	Comprehension	t	\N	Adequate material ready	Not Matched	68	Not Uptodate	Sufficient	3	3	3	3	4	3	5	3	t	t	t	t	t	t	t	18	f	t	t	t	f	\N	Attendance needs improvement.	2026-09-11 08:02:50.126106+05:30	2026-09-11 08:02:50.126106+05:30
418	8	\N	2024-05-16	30	t	t	\N	Fractions	Geometry	Simple words	Grammar	t	\N	Good preparation	Not Matched	78	Not Uptodate	More than required	3	3	3	2	4	2	5	3	t	t	t	t	f	t	t	13	t	t	f	t	f	\N	Attendance needs improvement.	2026-09-11 08:02:50.126107+05:30	2026-09-11 08:02:50.126107+05:30
419	8	\N	2024-06-17	16	t	t	\N	Multiplication	Algebra basics	Simple words	Vocabulary	f	\N	Teacher well prepared	Not Matched	95	Partial Upto Date	Sufficient	5	5	2	5	4	5	2	2	t	f	t	f	t	t	t	25	t	f	f	t	f	\N	Attendance needs improvement.	2026-09-11 08:02:50.126107+05:30	2026-09-11 08:02:50.126107+05:30
420	8	\N	2024-07-25	19	f	f	Exam preparation	Multiplication	Decimals	Short sentences	Grammar	t	\N	Needs improvement in planning	Not Matched	93	Not Uptodate	Lacking	2	2	3	3	5	5	4	5	t	t	f	f	f	t	f	30	t	t	t	t	t	\N	Overall good progress. Keep it up.	2026-09-11 08:02:50.126107+05:30	2026-09-11 08:02:50.126107+05:30
421	8	\N	2024-09-13	12	t	t	\N	Basic Numbers	Geometry	Reading	Vocabulary	t	\N	Needs improvement in planning	Not Matched	76	Not Uptodate	Sufficient	3	3	3	2	5	4	4	5	t	t	f	f	t	f	t	22	t	t	f	t	f	\N	Students are engaged and motivated.	2026-09-11 08:02:50.126108+05:30	2026-09-11 08:02:50.126108+05:30
422	8	\N	2024-10-13	24	t	t	\N	Basic Numbers	Decimals	Alphabets	Grammar	t	\N	Some gaps in preparation	Not Matched	79	Not Uptodate	More than required	3	2	3	3	2	4	2	3	f	t	f	t	f	t	f	13	t	t	t	t	t	\N	Attendance needs improvement.	2026-09-11 08:02:50.126108+05:30	2026-09-11 08:02:50.126108+05:30
423	8	\N	2024-12-10	11	t	t	\N	Addition, Subtraction	Percentages	Short sentences	Essay writing	f	\N	Good preparation	Not Matched	93	Not Uptodate	Sufficient	4	5	3	2	4	4	5	3	t	t	t	t	t	f	f	30	t	f	t	t	f	\N	Need to focus more on English reading.	2026-09-11 08:02:50.126108+05:30	2026-09-11 08:02:50.126108+05:30
424	8	\N	2025-01-23	21	t	f	Festival week	Basic Numbers	Decimals	Reading	Comprehension	f	\N	Needs improvement in planning	Not Matched	52	Upto Date	Sufficient	2	5	2	3	5	5	2	4	t	f	t	t	t	t	t	17	t	t	f	t	f	\N	Need to focus more on English reading.	2026-09-11 08:02:50.126108+05:30	2026-09-11 08:02:50.126109+05:30
425	8	\N	2025-03-04	10	t	t	\N	Multiplication	Geometry	Short sentences	Essay writing	f	\N	Teacher well prepared	Not Matched	91	Upto Date	More than required	3	5	3	5	4	5	5	2	f	t	t	t	t	t	f	19	t	t	f	t	f	\N	Teacher dedication is commendable.	2026-09-11 08:02:50.126109+05:30	2026-09-11 08:02:50.126109+05:30
426	8	\N	2025-04-28	29	t	t	\N	Basic Numbers	Geometry	Alphabets	Essay writing	t	\N	Adequate material ready	Matched	57	Partial Upto Date	Sufficient	5	3	4	5	4	3	4	3	t	f	f	f	t	t	f	24	t	t	t	f	f	\N	Academic performance is improving steadily.	2026-09-11 08:02:50.126109+05:30	2026-09-11 08:02:50.126109+05:30
427	8	\N	2025-05-23	13	t	f	Festival week	Multiplication	Algebra basics	Reading	Vocabulary	t	\N	Some gaps in preparation	Matched	40	Partial Upto Date	Sufficient	2	4	5	2	2	4	2	4	t	t	t	t	t	f	t	16	t	t	t	t	t	\N	Students are engaged and motivated.	2026-09-11 08:02:50.126109+05:30	2026-09-11 08:02:50.12611+05:30
428	8	\N	2025-08-30	18	t	t	\N	Multiplication	Percentages	Simple words	Comprehension	t	\N	Some gaps in preparation	Not Matched	74	Partial Upto Date	Sufficient	3	2	5	2	2	5	2	2	t	t	t	t	f	t	f	17	t	t	f	f	t	\N	Academic performance is improving steadily.	2026-09-11 08:02:50.12611+05:30	2026-09-11 08:02:50.12611+05:30
429	8	\N	2025-10-03	12	f	t	Exam preparation	Addition, Subtraction	Decimals	Short sentences	Vocabulary	t	\N	Needs improvement in planning	Matched	95	Not Uptodate	Lacking	4	5	3	4	4	5	5	2	t	t	t	f	t	t	t	24	t	f	f	t	t	\N	Academic performance is improving steadily.	2026-09-11 08:02:50.12611+05:30	2026-09-11 08:02:50.12611+05:30
430	8	\N	2025-11-01	28	t	t	\N	Basic Numbers	Geometry	Simple words	Comprehension	f	\N	Teacher well prepared	Matched	61	Upto Date	More than required	5	5	4	3	3	2	5	2	t	t	t	f	t	f	t	27	t	f	f	t	f	\N	Teacher dedication is commendable.	2026-09-11 08:02:50.12611+05:30	2026-09-11 08:02:50.12611+05:30
431	8	\N	2025-12-16	14	t	t	\N	Addition, Subtraction	Geometry	Simple words	Vocabulary	t	\N	Teacher well prepared	Not Matched	52	Upto Date	More than required	4	4	4	5	4	2	2	5	f	f	t	f	f	t	f	11	f	f	t	t	f	\N	Teacher dedication is commendable.	2026-09-11 08:02:50.126111+05:30	2026-09-11 08:02:50.126111+05:30
432	8	\N	2026-01-15	22	t	t	\N	Basic Numbers	Geometry	Simple words	Vocabulary	t	\N	Some gaps in preparation	Not Matched	93	Partial Upto Date	Lacking	3	4	3	3	2	2	2	3	t	t	t	f	t	t	f	22	f	t	f	t	f	\N	Excellent classroom environment.	2026-09-11 08:02:50.126111+05:30	2026-09-11 08:02:50.126111+05:30
433	8	\N	2026-02-21	22	t	f	Weather disruption	Multiplication	Geometry	Reading	Grammar	t	\N	Needs improvement in planning	Not Matched	66	Not Uptodate	More than required	4	2	2	5	4	2	5	2	t	t	f	f	f	t	t	24	f	t	t	t	t	\N	Teacher dedication is commendable.	2026-09-11 08:02:50.126111+05:30	2026-09-11 08:02:50.126111+05:30
434	8	\N	2026-04-22	19	t	f	Teacher absent	Fractions	Algebra basics	Reading	Vocabulary	t	\N	Teacher well prepared	Not Matched	66	Partial Upto Date	Lacking	4	3	2	4	4	2	5	3	t	t	t	t	t	t	t	24	t	f	t	t	f	\N	Academic performance is improving steadily.	2026-09-11 08:02:50.126111+05:30	2026-09-11 08:02:50.126112+05:30
435	8	\N	2026-05-21	29	t	t	\N	Multiplication	Geometry	Reading	Essay writing	f	\N	Adequate material ready	Matched	71	Upto Date	More than required	2	4	2	3	3	5	5	5	t	t	t	t	t	t	f	11	t	t	t	t	t	\N	Attendance needs improvement.	2026-09-11 08:02:50.126112+05:30	2026-09-11 08:02:50.126112+05:30
436	8	\N	2026-06-26	18	t	t	\N	Multiplication	Decimals	Alphabets	Essay writing	f	\N	Teacher well prepared	Not Matched	83	Partial Upto Date	More than required	2	2	4	5	4	4	4	4	f	t	t	t	t	t	t	24	t	t	t	t	t	\N	Academic performance is improving steadily.	2026-09-11 08:02:50.126112+05:30	2026-09-11 08:02:50.126112+05:30
437	8	\N	2026-08-02	26	t	t	\N	Addition, Subtraction	Decimals	Short sentences	Comprehension	t	\N	Adequate material ready	Matched	42	Upto Date	More than required	2	2	3	2	2	2	3	5	t	f	t	f	f	t	f	17	t	f	t	f	f	\N	Academic performance is improving steadily.	2026-09-11 08:02:50.126112+05:30	2026-09-11 08:02:50.126113+05:30
438	9	\N	2024-01-04	34	t	t	\N	Basic Numbers	Decimals	Reading	Vocabulary	f	\N	Good preparation	Matched	40	Partial Upto Date	More than required	5	2	4	4	4	5	2	2	t	f	t	f	f	t	t	13	t	f	t	t	f	\N	Overall good progress. Keep it up.	2026-09-11 08:02:50.126113+05:30	2026-09-11 08:02:50.126113+05:30
439	9	\N	2024-02-13	12	t	t	\N	Basic Numbers	Geometry	Simple words	Grammar	t	\N	Some gaps in preparation	Matched	71	Partial Upto Date	Sufficient	4	5	5	2	2	4	2	4	f	t	t	f	t	t	t	26	t	t	t	t	t	\N	Attendance needs improvement.	2026-09-11 08:02:50.126113+05:30	2026-09-11 08:02:50.126113+05:30
440	9	\N	2024-03-18	17	f	t	Festival week	Addition, Subtraction	Geometry	Alphabets	Essay writing	f	\N	Good preparation	Not Matched	79	Upto Date	More than required	2	2	2	5	3	2	3	5	t	f	t	t	t	t	t	18	f	f	f	t	f	\N	Overall good progress. Keep it up.	2026-09-11 08:02:50.126113+05:30	2026-09-11 08:02:50.126113+05:30
441	9	\N	2024-04-29	23	t	t	\N	Multiplication	Percentages	Simple words	Vocabulary	t	\N	Some gaps in preparation	Matched	48	Upto Date	More than required	5	3	2	5	2	2	2	3	f	t	t	t	t	f	f	30	t	t	t	t	t	\N	Students are engaged and motivated.	2026-09-11 08:02:50.126114+05:30	2026-09-11 08:02:50.126114+05:30
442	9	\N	2024-06-26	15	t	t	\N	Basic Numbers	Algebra basics	Short sentences	Essay writing	t	\N	Some gaps in preparation	Matched	52	Upto Date	More than required	2	4	3	5	3	4	2	3	t	t	f	f	t	t	t	9	t	t	t	t	f	\N	Overall good progress. Keep it up.	2026-09-11 08:02:50.126114+05:30	2026-09-11 08:02:50.126114+05:30
443	9	\N	2024-07-30	27	t	t	\N	Multiplication	Geometry	Alphabets	Vocabulary	t	\N	Good preparation	Matched	86	Partial Upto Date	More than required	4	5	3	4	3	2	4	3	t	t	f	t	t	t	f	9	f	t	f	t	f	\N	Need to focus more on English reading.	2026-09-11 08:02:50.126114+05:30	2026-09-11 08:02:50.126114+05:30
444	9	\N	2024-09-18	30	t	t	\N	Fractions	Percentages	Simple words	Essay writing	t	\N	Some gaps in preparation	Matched	57	Upto Date	Sufficient	5	5	5	3	4	3	4	3	f	t	t	t	f	f	t	21	f	t	f	t	f	\N	Need to focus more on English reading.	2026-09-11 08:02:50.126115+05:30	2026-09-11 08:02:50.126115+05:30
445	9	\N	2024-11-03	17	t	t	\N	Multiplication	Percentages	Reading	Comprehension	f	\N	Some gaps in preparation	Matched	98	Not Uptodate	Sufficient	5	2	2	5	2	5	5	5	f	t	t	t	t	f	f	14	t	t	t	t	f	\N	Teacher dedication is commendable.	2026-09-11 08:02:50.126115+05:30	2026-09-11 08:02:50.126115+05:30
446	9	\N	2024-12-11	28	t	t	\N	Addition, Subtraction	Decimals	Reading	Comprehension	f	\N	Teacher well prepared	Matched	90	Partial Upto Date	More than required	5	2	2	5	4	2	4	5	f	t	t	t	t	t	f	9	t	f	t	t	f	\N	Need to focus more on English reading.	2026-09-11 08:02:50.126115+05:30	2026-09-11 08:02:50.126115+05:30
447	9	\N	2025-01-25	21	t	t	\N	Multiplication	Algebra basics	Simple words	Comprehension	f	\N	Needs improvement in planning	Matched	81	Partial Upto Date	More than required	3	3	4	4	4	5	4	2	t	t	t	t	t	t	f	22	t	f	f	f	t	\N	Students are engaged and motivated.	2026-09-11 08:02:50.126115+05:30	2026-09-11 08:02:50.126116+05:30
448	9	\N	2025-02-27	12	f	t	Exam preparation	Multiplication	Percentages	Alphabets	Grammar	t	\N	Good preparation	Matched	71	Upto Date	Sufficient	2	4	5	3	5	4	5	5	t	t	t	t	f	f	f	21	t	t	f	t	f	\N	Attendance needs improvement.	2026-09-11 08:02:50.126116+05:30	2026-09-11 08:02:50.126116+05:30
449	9	\N	2025-04-16	35	t	t	\N	Fractions	Geometry	Short sentences	Comprehension	t	\N	Adequate material ready	Matched	49	Partial Upto Date	Lacking	5	3	3	4	3	3	3	3	t	t	t	t	t	t	t	29	t	t	t	t	t	\N	Excellent classroom environment.	2026-09-11 08:02:50.126116+05:30	2026-09-11 08:02:50.126116+05:30
450	9	\N	2025-06-08	22	t	f	Exam preparation	Multiplication	Decimals	Short sentences	Comprehension	t	\N	Some gaps in preparation	Not Matched	81	Not Uptodate	Lacking	5	4	3	5	4	2	5	2	t	t	t	t	f	t	t	18	t	t	t	t	f	\N	Students are engaged and motivated.	2026-09-11 08:02:50.126116+05:30	2026-09-11 08:02:50.126117+05:30
451	9	\N	2025-07-15	24	t	t	\N	Addition, Subtraction	Decimals	Simple words	Vocabulary	t	\N	Some gaps in preparation	Matched	98	Not Uptodate	Lacking	5	3	5	4	5	4	2	4	t	t	t	t	t	f	f	22	t	f	f	t	f	\N	Students are engaged and motivated.	2026-09-11 08:02:50.126117+05:30	2026-09-11 08:02:50.126117+05:30
452	9	\N	2025-08-30	14	f	t	Festival week	Fractions	Decimals	Short sentences	Grammar	f	\N	Some gaps in preparation	Not Matched	45	Upto Date	Lacking	4	5	3	5	3	3	3	5	t	t	f	t	t	t	f	15	t	t	t	f	f	\N	Overall good progress. Keep it up.	2026-09-11 08:02:50.126117+05:30	2026-09-11 08:02:50.126117+05:30
453	9	\N	2025-10-01	23	t	f	Festival week	Basic Numbers	Geometry	Alphabets	Grammar	f	\N	Teacher well prepared	Matched	78	Not Uptodate	Lacking	5	5	4	5	2	4	2	4	t	t	t	f	t	t	f	19	t	f	t	t	t	\N	Excellent classroom environment.	2026-09-11 08:02:50.126117+05:30	2026-09-11 08:02:50.126117+05:30
454	9	\N	2025-11-05	34	t	t	\N	Addition, Subtraction	Geometry	Short sentences	Essay writing	f	\N	Adequate material ready	Not Matched	83	Not Uptodate	More than required	4	2	4	3	2	3	4	4	f	t	f	t	t	t	t	25	t	f	t	t	t	\N	Attendance needs improvement.	2026-09-11 08:02:50.126118+05:30	2026-09-11 08:02:50.126118+05:30
455	9	\N	2025-12-28	14	t	t	\N	Addition, Subtraction	Decimals	Short sentences	Essay writing	t	\N	Needs improvement in planning	Not Matched	96	Not Uptodate	More than required	4	3	4	2	2	3	3	3	t	t	t	f	t	f	t	10	t	t	t	t	t	\N	Academic performance is improving steadily.	2026-09-11 08:02:50.126118+05:30	2026-09-11 08:02:50.126118+05:30
456	9	\N	2026-02-05	25	t	t	\N	Addition, Subtraction	Percentages	Alphabets	Grammar	t	\N	Good preparation	Matched	90	Upto Date	More than required	3	3	3	4	2	2	3	4	f	t	t	t	t	t	t	11	f	f	t	t	f	\N	Students are engaged and motivated.	2026-09-11 08:02:50.126118+05:30	2026-09-11 08:02:50.126118+05:30
457	9	\N	2026-03-13	33	f	t	Teacher absent	Multiplication	Decimals	Short sentences	Comprehension	t	\N	Good preparation	Matched	93	Partial Upto Date	Lacking	5	3	3	5	2	4	2	5	t	t	f	t	t	t	f	23	t	t	t	t	f	\N	Students are engaged and motivated.	2026-09-11 08:02:50.126118+05:30	2026-09-11 08:02:50.126119+05:30
458	9	\N	2026-04-26	23	t	t	\N	Multiplication	Algebra basics	Reading	Essay writing	t	\N	Teacher well prepared	Matched	65	Partial Upto Date	More than required	2	2	3	5	5	2	3	2	t	t	t	f	t	t	f	23	t	t	t	t	f	\N	Need to focus more on English reading.	2026-09-11 08:02:50.126119+05:30	2026-09-11 08:02:50.126119+05:30
459	9	\N	2026-05-12	22	t	t	\N	Basic Numbers	Percentages	Simple words	Vocabulary	t	\N	Adequate material ready	Not Matched	71	Upto Date	More than required	3	2	2	2	2	5	2	3	t	t	t	t	t	t	f	22	t	t	t	t	f	\N	Academic performance is improving steadily.	2026-09-11 08:02:50.126119+05:30	2026-09-11 08:02:50.126119+05:30
460	9	\N	2026-07-05	34	f	t	Teacher absent	Basic Numbers	Algebra basics	Reading	Vocabulary	t	\N	Teacher well prepared	Not Matched	69	Upto Date	Sufficient	3	4	3	5	5	3	4	5	t	t	t	t	t	t	f	25	f	t	t	t	f	\N	Excellent classroom environment.	2026-09-11 08:02:50.12612+05:30	2026-09-11 08:02:50.126121+05:30
461	9	\N	2026-08-15	19	t	f	Weather disruption	Addition, Subtraction	Algebra basics	Alphabets	Comprehension	f	\N	Adequate material ready	Matched	88	Not Uptodate	Lacking	5	2	5	4	4	5	4	2	t	t	t	t	f	t	f	11	t	t	t	t	f	\N	Excellent classroom environment.	2026-09-11 08:02:50.126121+05:30	2026-09-11 08:02:50.126121+05:30
462	10	\N	2024-01-07	35	t	t	\N	Fractions	Decimals	Short sentences	Comprehension	t	\N	Adequate material ready	Not Matched	82	Not Uptodate	Sufficient	2	3	5	3	5	4	5	2	t	t	t	t	t	t	f	21	t	f	t	t	f	\N	Need to focus more on English reading.	2026-09-11 08:02:50.126121+05:30	2026-09-11 08:02:50.126121+05:30
463	10	\N	2024-02-16	18	f	t	Festival week	Basic Numbers	Geometry	Alphabets	Comprehension	t	\N	Needs improvement in planning	Not Matched	69	Partial Upto Date	More than required	5	5	2	3	3	4	3	2	t	f	t	t	f	f	f	8	t	f	t	t	t	\N	Attendance needs improvement.	2026-09-11 08:02:50.126121+05:30	2026-09-11 08:02:50.126122+05:30
464	10	\N	2024-03-29	12	f	t	Exam preparation	Multiplication	Geometry	Alphabets	Grammar	t	\N	Some gaps in preparation	Not Matched	71	Upto Date	Sufficient	2	4	4	5	3	5	3	3	t	t	t	t	f	t	f	30	f	t	t	t	f	\N	Academic performance is improving steadily.	2026-09-11 08:02:50.126122+05:30	2026-09-11 08:02:50.126122+05:30
465	10	\N	2024-04-28	32	f	t	Weather disruption	Fractions	Algebra basics	Alphabets	Grammar	t	\N	Needs improvement in planning	Not Matched	75	Partial Upto Date	Lacking	4	2	3	5	5	2	5	4	t	f	f	t	f	t	f	28	t	f	t	f	f	\N	Academic performance is improving steadily.	2026-09-11 08:02:50.126122+05:30	2026-09-11 08:02:50.126122+05:30
466	10	\N	2024-06-22	25	t	f	Exam preparation	Basic Numbers	Percentages	Reading	Grammar	f	\N	Adequate material ready	Matched	62	Partial Upto Date	More than required	4	5	2	2	3	5	3	2	t	t	t	t	t	t	t	27	t	f	t	t	t	\N	Need to focus more on English reading.	2026-09-11 08:02:50.126122+05:30	2026-09-11 08:02:50.126122+05:30
467	10	\N	2024-07-31	20	t	t	\N	Fractions	Geometry	Alphabets	Vocabulary	t	\N	Teacher well prepared	Not Matched	100	Not Uptodate	Sufficient	2	2	3	2	5	3	4	3	t	t	t	t	f	t	t	8	t	t	f	t	f	\N	Overall good progress. Keep it up.	2026-09-11 08:02:50.126123+05:30	2026-09-11 08:02:50.126123+05:30
468	10	\N	2024-09-12	35	t	t	\N	Fractions	Percentages	Reading	Vocabulary	t	\N	Needs improvement in planning	Matched	92	Partial Upto Date	More than required	3	5	3	5	3	2	4	4	t	t	t	t	t	t	f	12	f	f	t	t	f	\N	Teacher dedication is commendable.	2026-09-11 08:02:50.126123+05:30	2026-09-11 08:02:50.126123+05:30
469	10	\N	2024-10-11	12	t	t	\N	Addition, Subtraction	Algebra basics	Alphabets	Essay writing	f	\N	Teacher well prepared	Not Matched	78	Not Uptodate	More than required	2	2	4	5	4	5	4	3	f	t	t	t	t	f	f	12	t	t	t	t	f	\N	Overall good progress. Keep it up.	2026-09-11 08:02:50.126123+05:30	2026-09-11 08:02:50.126123+05:30
470	10	\N	2024-12-04	18	f	t	Weather disruption	Basic Numbers	Percentages	Short sentences	Essay writing	t	\N	Teacher well prepared	Matched	60	Not Uptodate	Lacking	3	5	2	3	3	2	3	3	t	t	t	t	f	f	t	22	t	t	t	t	t	\N	Overall good progress. Keep it up.	2026-09-11 08:02:50.126124+05:30	2026-09-11 08:02:50.126124+05:30
471	10	\N	2025-01-08	19	t	t	\N	Multiplication	Geometry	Short sentences	Comprehension	t	\N	Good preparation	Matched	66	Upto Date	Sufficient	5	2	4	2	4	2	5	4	t	f	f	t	t	f	f	22	t	t	t	t	t	\N	Teacher dedication is commendable.	2026-09-11 08:02:50.126124+05:30	2026-09-11 08:02:50.126124+05:30
472	10	\N	2025-02-27	33	t	t	\N	Multiplication	Geometry	Alphabets	Essay writing	t	\N	Good preparation	Matched	75	Not Uptodate	Lacking	2	5	4	3	3	5	2	2	f	t	f	t	f	t	t	17	t	t	f	t	t	\N	Need to focus more on English reading.	2026-09-11 08:02:50.126124+05:30	2026-09-11 08:02:50.126124+05:30
473	10	\N	2025-04-11	26	t	f	Festival week	Basic Numbers	Decimals	Reading	Vocabulary	t	\N	Some gaps in preparation	Not Matched	45	Partial Upto Date	Lacking	3	5	5	2	2	4	5	3	t	t	f	t	t	t	f	21	t	f	t	f	f	\N	Academic performance is improving steadily.	2026-09-11 08:02:50.126124+05:30	2026-09-11 08:02:50.126125+05:30
474	10	\N	2025-06-14	28	t	t	\N	Addition, Subtraction	Algebra basics	Alphabets	Grammar	t	\N	Teacher well prepared	Matched	69	Not Uptodate	More than required	4	4	4	2	2	2	5	3	f	f	t	t	t	t	f	29	t	f	t	f	t	\N	Students are engaged and motivated.	2026-09-11 08:02:50.126125+05:30	2026-09-11 08:02:50.126125+05:30
475	10	\N	2025-07-18	29	t	t	\N	Fractions	Algebra basics	Reading	Grammar	t	\N	Good preparation	Matched	50	Not Uptodate	Lacking	5	5	5	4	4	5	4	2	t	t	t	t	f	f	t	23	t	t	t	t	t	\N	Overall good progress. Keep it up.	2026-09-11 08:02:50.126125+05:30	2026-09-11 08:02:50.126125+05:30
476	10	\N	2025-08-20	25	t	t	\N	Basic Numbers	Algebra basics	Alphabets	Comprehension	f	\N	Teacher well prepared	Not Matched	70	Upto Date	Lacking	3	3	4	5	2	4	2	2	t	t	f	f	t	t	f	9	t	t	t	t	f	\N	Students are engaged and motivated.	2026-09-11 08:02:50.126125+05:30	2026-09-11 08:02:50.126125+05:30
477	10	\N	2025-09-24	23	t	t	\N	Fractions	Algebra basics	Short sentences	Vocabulary	f	\N	Good preparation	Not Matched	79	Not Uptodate	Lacking	5	5	2	3	4	3	5	4	t	t	t	t	f	f	f	12	f	t	t	t	f	\N	Academic performance is improving steadily.	2026-09-11 08:02:50.126126+05:30	2026-09-11 08:02:50.126126+05:30
478	10	\N	2025-11-24	15	t	f	Festival week	Fractions	Algebra basics	Reading	Comprehension	t	\N	Needs improvement in planning	Not Matched	46	Partial Upto Date	Lacking	4	3	3	2	2	4	4	4	t	t	f	t	f	t	t	27	t	t	t	f	f	\N	Academic performance is improving steadily.	2026-09-11 08:02:50.126126+05:30	2026-09-11 08:02:50.126126+05:30
479	10	\N	2025-12-30	18	t	f	Festival week	Addition, Subtraction	Algebra basics	Reading	Vocabulary	f	\N	Good preparation	Matched	90	Not Uptodate	More than required	2	2	2	3	2	3	4	3	t	t	f	t	f	t	f	18	f	t	t	f	t	\N	Students are engaged and motivated.	2026-09-11 08:02:50.126126+05:30	2026-09-11 08:02:50.126126+05:30
480	10	\N	2026-02-16	19	f	t	Festival week	Addition, Subtraction	Percentages	Short sentences	Vocabulary	t	\N	Needs improvement in planning	Matched	88	Not Uptodate	Lacking	3	3	5	5	5	5	4	2	t	f	t	t	t	t	f	13	t	t	t	f	t	\N	Excellent classroom environment.	2026-09-11 08:02:50.126127+05:30	2026-09-11 08:02:50.126127+05:30
481	10	\N	2026-03-26	32	t	t	\N	Fractions	Decimals	Reading	Essay writing	t	\N	Adequate material ready	Not Matched	40	Partial Upto Date	More than required	3	5	5	3	5	4	5	3	f	t	t	t	t	f	f	14	t	t	t	f	t	\N	Overall good progress. Keep it up.	2026-09-11 08:02:50.126127+05:30	2026-09-11 08:02:50.126127+05:30
482	10	\N	2026-04-30	28	t	f	Weather disruption	Multiplication	Percentages	Reading	Grammar	t	\N	Adequate material ready	Not Matched	80	Not Uptodate	Lacking	2	2	2	5	4	2	5	4	f	f	f	t	f	t	t	19	t	t	f	t	t	\N	Teacher dedication is commendable.	2026-09-11 08:02:50.126127+05:30	2026-09-11 08:02:50.126127+05:30
483	10	\N	2026-06-16	13	t	t	\N	Fractions	Geometry	Short sentences	Vocabulary	t	\N	Teacher well prepared	Not Matched	45	Upto Date	Sufficient	5	3	5	3	5	2	4	5	t	t	t	t	t	t	f	30	f	t	f	f	t	\N	Excellent classroom environment.	2026-09-11 08:02:50.126127+05:30	2026-09-11 08:02:50.126128+05:30
484	10	\N	2026-07-31	14	t	t	\N	Addition, Subtraction	Geometry	Reading	Vocabulary	t	\N	Needs improvement in planning	Not Matched	98	Upto Date	More than required	5	2	2	4	4	2	3	2	t	f	t	t	f	t	f	9	f	t	t	t	f	\N	Overall good progress. Keep it up.	2026-09-11 08:02:50.126128+05:30	2026-09-11 08:02:50.126128+05:30
485	10	\N	2026-09-08	11	t	t	\N	Basic Numbers	Decimals	Short sentences	Vocabulary	f	\N	Teacher well prepared	Not Matched	93	Not Uptodate	More than required	3	3	5	5	5	3	4	2	f	t	t	t	t	t	f	16	t	f	t	t	f	\N	Excellent classroom environment.	2026-09-11 08:02:50.126128+05:30	2026-09-11 08:02:50.126128+05:30
486	11	\N	2024-01-11	19	t	t	\N	Basic Numbers	Algebra basics	Short sentences	Comprehension	t	\N	Adequate material ready	Not Matched	64	Upto Date	Sufficient	3	3	3	5	5	2	4	2	t	t	t	t	t	f	t	16	t	t	t	f	t	\N	Need to focus more on English reading.	2026-09-11 08:02:50.126128+05:30	2026-09-11 08:02:50.126128+05:30
487	11	\N	2024-02-18	30	t	t	\N	Multiplication	Geometry	Short sentences	Comprehension	f	\N	Some gaps in preparation	Not Matched	98	Not Uptodate	Lacking	2	2	5	4	3	2	2	5	t	t	t	f	f	t	f	9	t	t	t	t	t	\N	Academic performance is improving steadily.	2026-09-11 08:02:50.126129+05:30	2026-09-11 08:02:50.126129+05:30
488	11	\N	2024-03-12	18	t	t	\N	Basic Numbers	Geometry	Short sentences	Essay writing	t	\N	Teacher well prepared	Not Matched	55	Not Uptodate	Lacking	4	3	5	4	2	3	2	5	t	t	t	t	t	t	f	25	t	f	t	t	f	\N	Teacher dedication is commendable.	2026-09-11 08:02:50.126129+05:30	2026-09-11 08:02:50.126129+05:30
489	11	\N	2024-04-29	22	t	f	Weather disruption	Basic Numbers	Geometry	Alphabets	Grammar	t	\N	Needs improvement in planning	Not Matched	40	Upto Date	More than required	2	4	4	3	2	4	3	3	f	f	t	t	t	t	t	14	f	t	t	t	f	\N	Students are engaged and motivated.	2026-09-11 08:02:50.126129+05:30	2026-09-11 08:02:50.126129+05:30
490	11	\N	2024-06-06	28	t	t	\N	Multiplication	Algebra basics	Simple words	Grammar	t	\N	Some gaps in preparation	Matched	96	Not Uptodate	More than required	4	3	2	4	5	2	5	2	f	t	f	t	t	t	f	19	t	t	t	t	f	\N	Excellent classroom environment.	2026-09-11 08:02:50.12613+05:30	2026-09-11 08:02:50.12613+05:30
491	11	\N	2024-06-29	16	t	t	\N	Fractions	Algebra basics	Alphabets	Comprehension	f	\N	Teacher well prepared	Matched	98	Upto Date	Sufficient	3	4	4	2	2	2	5	5	f	t	t	t	t	t	t	18	f	f	t	t	t	\N	Academic performance is improving steadily.	2026-09-11 08:02:50.12613+05:30	2026-09-11 08:02:50.12613+05:30
492	11	\N	2024-08-05	13	t	t	\N	Basic Numbers	Algebra basics	Alphabets	Grammar	f	\N	Teacher well prepared	Not Matched	96	Not Uptodate	Sufficient	3	2	5	2	4	5	2	2	t	t	t	t	t	f	t	27	f	t	t	t	f	\N	Excellent classroom environment.	2026-09-11 08:02:50.12613+05:30	2026-09-11 08:02:50.12613+05:30
493	11	\N	2024-09-23	31	t	t	\N	Addition, Subtraction	Decimals	Short sentences	Comprehension	t	\N	Good preparation	Matched	77	Upto Date	More than required	3	4	4	5	5	5	3	3	t	t	t	t	t	t	f	17	t	t	t	t	f	\N	Need to focus more on English reading.	2026-09-11 08:02:50.126131+05:30	2026-09-11 08:02:50.126131+05:30
494	11	\N	2024-11-16	28	t	t	\N	Multiplication	Algebra basics	Simple words	Grammar	t	\N	Needs improvement in planning	Matched	80	Upto Date	Sufficient	4	3	5	5	4	4	4	5	t	t	f	f	t	f	t	30	t	t	t	t	f	\N	Academic performance is improving steadily.	2026-09-11 08:02:50.126131+05:30	2026-09-11 08:02:50.126131+05:30
495	11	\N	2024-12-19	15	t	t	\N	Addition, Subtraction	Percentages	Alphabets	Grammar	t	\N	Some gaps in preparation	Matched	49	Partial Upto Date	Lacking	3	4	2	2	3	3	4	3	t	t	t	f	t	t	t	16	f	t	t	t	t	\N	Need to focus more on English reading.	2026-09-11 08:02:50.126131+05:30	2026-09-11 08:02:50.126131+05:30
496	11	\N	2025-02-12	17	f	t	Weather disruption	Fractions	Geometry	Reading	Grammar	t	\N	Needs improvement in planning	Matched	52	Not Uptodate	Lacking	4	4	5	3	2	3	4	3	t	t	f	f	f	f	f	14	t	f	f	t	t	\N	Excellent classroom environment.	2026-09-11 08:02:50.126131+05:30	2026-09-11 08:02:50.126132+05:30
497	11	\N	2025-03-23	34	t	f	Weather disruption	Basic Numbers	Decimals	Simple words	Essay writing	t	\N	Some gaps in preparation	Not Matched	85	Partial Upto Date	Lacking	4	5	2	3	3	3	5	3	t	t	f	t	f	t	t	12	f	t	t	t	t	\N	Attendance needs improvement.	2026-09-11 08:02:50.126132+05:30	2026-09-11 08:02:50.126132+05:30
498	11	\N	2025-04-22	24	t	t	\N	Basic Numbers	Decimals	Reading	Essay writing	f	\N	Adequate material ready	Not Matched	64	Upto Date	Sufficient	5	3	4	2	4	2	4	2	f	f	t	t	t	t	t	29	t	t	f	t	f	\N	Students are engaged and motivated.	2026-09-11 08:02:50.126132+05:30	2026-09-11 08:02:50.126132+05:30
499	11	\N	2025-06-04	34	t	f	Weather disruption	Addition, Subtraction	Percentages	Short sentences	Essay writing	f	\N	Teacher well prepared	Not Matched	92	Not Uptodate	More than required	2	5	3	5	3	3	3	5	t	t	t	t	f	t	t	18	f	t	f	t	f	\N	Attendance needs improvement.	2026-09-11 08:02:50.126132+05:30	2026-09-11 08:02:50.126133+05:30
500	11	\N	2025-07-17	14	f	t	Festival week	Fractions	Algebra basics	Reading	Essay writing	t	\N	Teacher well prepared	Not Matched	83	Partial Upto Date	More than required	4	4	2	2	3	3	4	5	f	t	t	t	t	t	f	28	f	t	t	t	t	\N	Academic performance is improving steadily.	2026-09-11 08:02:50.126133+05:30	2026-09-11 08:02:50.126133+05:30
501	11	\N	2025-09-12	15	t	t	\N	Multiplication	Algebra basics	Reading	Essay writing	t	\N	Adequate material ready	Matched	69	Upto Date	Lacking	2	3	4	5	5	3	2	3	t	t	t	f	f	t	t	17	t	t	t	t	f	\N	Excellent classroom environment.	2026-09-11 08:02:50.126133+05:30	2026-09-11 08:02:50.126133+05:30
502	11	\N	2025-10-15	24	t	t	\N	Fractions	Geometry	Alphabets	Comprehension	t	\N	Teacher well prepared	Matched	73	Partial Upto Date	More than required	5	5	5	2	2	4	5	4	t	t	t	t	f	t	t	13	f	t	t	f	t	\N	Teacher dedication is commendable.	2026-09-11 08:02:50.126133+05:30	2026-09-11 08:02:50.126133+05:30
503	11	\N	2025-11-23	11	t	t	\N	Multiplication	Geometry	Short sentences	Essay writing	t	\N	Good preparation	Matched	98	Partial Upto Date	Lacking	2	4	2	2	4	5	5	3	t	t	t	t	t	t	f	18	t	f	t	t	t	\N	Teacher dedication is commendable.	2026-09-11 08:02:50.126134+05:30	2026-09-11 08:02:50.126134+05:30
504	11	\N	2026-01-08	33	f	t	Exam preparation	Basic Numbers	Decimals	Alphabets	Grammar	t	\N	Needs improvement in planning	Not Matched	48	Partial Upto Date	Lacking	3	3	2	2	3	4	2	5	t	t	t	t	t	t	t	29	t	t	t	t	t	\N	Attendance needs improvement.	2026-09-11 08:02:50.126134+05:30	2026-09-11 08:02:50.126134+05:30
505	11	\N	2026-02-12	29	t	t	\N	Addition, Subtraction	Algebra basics	Reading	Comprehension	f	\N	Adequate material ready	Matched	52	Upto Date	Sufficient	5	2	2	4	3	2	3	2	f	f	t	t	t	t	f	18	t	t	t	t	f	\N	Overall good progress. Keep it up.	2026-09-11 08:02:50.126134+05:30	2026-09-11 08:02:50.126134+05:30
506	11	\N	2026-03-24	20	t	t	\N	Multiplication	Algebra basics	Reading	Essay writing	t	\N	Needs improvement in planning	Not Matched	54	Upto Date	More than required	4	4	2	2	3	5	4	5	f	t	t	f	f	t	t	27	t	t	t	f	t	\N	Need to focus more on English reading.	2026-09-11 08:02:50.126135+05:30	2026-09-11 08:02:50.126135+05:30
507	11	\N	2026-05-09	32	t	f	Weather disruption	Basic Numbers	Algebra basics	Short sentences	Grammar	t	\N	Some gaps in preparation	Not Matched	64	Not Uptodate	More than required	3	2	3	2	2	4	3	5	f	t	t	t	t	t	t	28	t	f	t	f	f	\N	Students are engaged and motivated.	2026-09-11 08:02:50.126135+05:30	2026-09-11 08:02:50.126135+05:30
508	11	\N	2026-06-22	34	t	t	\N	Addition, Subtraction	Decimals	Short sentences	Grammar	t	\N	Adequate material ready	Not Matched	55	Upto Date	More than required	2	3	3	5	4	3	5	2	t	t	f	t	f	f	t	10	t	t	f	t	t	\N	Attendance needs improvement.	2026-09-11 08:02:50.126135+05:30	2026-09-11 08:02:50.126135+05:30
509	11	\N	2026-08-11	33	t	t	\N	Multiplication	Geometry	Reading	Comprehension	t	\N	Adequate material ready	Not Matched	76	Partial Upto Date	More than required	3	4	5	2	4	5	5	3	t	t	t	t	t	f	f	8	f	t	t	f	f	\N	Excellent classroom environment.	2026-09-11 08:02:50.126135+05:30	2026-09-11 08:02:50.126136+05:30
510	12	\N	2024-01-08	23	t	t	\N	Multiplication	Geometry	Reading	Grammar	f	\N	Adequate material ready	Matched	84	Not Uptodate	More than required	3	4	5	3	4	3	3	2	t	t	t	t	t	f	t	24	f	f	t	t	f	\N	Excellent classroom environment.	2026-09-11 08:02:50.126136+05:30	2026-09-11 08:02:50.126136+05:30
511	12	\N	2024-02-16	22	f	t	Weather disruption	Basic Numbers	Algebra basics	Alphabets	Essay writing	f	\N	Adequate material ready	Matched	99	Not Uptodate	Lacking	4	2	3	5	2	2	2	5	t	t	t	t	t	t	t	23	t	f	t	f	t	\N	Students are engaged and motivated.	2026-09-11 08:02:50.126136+05:30	2026-09-11 08:02:50.126136+05:30
512	12	\N	2024-03-18	34	t	t	\N	Multiplication	Percentages	Reading	Vocabulary	t	\N	Some gaps in preparation	Matched	95	Not Uptodate	Sufficient	2	4	2	5	2	4	2	4	t	t	t	f	t	t	t	29	t	f	t	t	t	\N	Attendance needs improvement.	2026-09-11 08:02:50.126136+05:30	2026-09-11 08:02:50.126136+05:30
513	12	\N	2024-05-10	34	t	f	Weather disruption	Basic Numbers	Decimals	Short sentences	Vocabulary	t	\N	Adequate material ready	Not Matched	92	Upto Date	Lacking	5	5	2	4	4	2	2	5	f	t	f	f	t	t	f	30	f	t	t	t	f	\N	Excellent classroom environment.	2026-09-11 08:02:50.126137+05:30	2026-09-11 08:02:50.126137+05:30
514	12	\N	2024-06-23	30	t	t	\N	Fractions	Algebra basics	Short sentences	Grammar	f	\N	Adequate material ready	Not Matched	54	Not Uptodate	Lacking	5	2	4	5	5	2	5	4	t	t	f	f	f	t	t	12	t	t	f	f	f	\N	Students are engaged and motivated.	2026-09-11 08:02:50.126137+05:30	2026-09-11 08:02:50.126137+05:30
515	12	\N	2024-08-04	25	f	f	Festival week	Multiplication	Geometry	Simple words	Grammar	t	\N	Good preparation	Matched	99	Partial Upto Date	Lacking	4	3	4	5	2	3	5	2	f	t	t	t	f	t	f	20	f	t	t	t	f	\N	Academic performance is improving steadily.	2026-09-11 08:02:50.126137+05:30	2026-09-11 08:02:50.126137+05:30
516	12	\N	2024-09-13	19	t	t	\N	Addition, Subtraction	Algebra basics	Alphabets	Essay writing	t	\N	Needs improvement in planning	Matched	76	Partial Upto Date	Sufficient	4	5	2	4	2	3	5	5	t	t	t	f	t	t	t	11	t	t	t	t	f	\N	Academic performance is improving steadily.	2026-09-11 08:02:50.126138+05:30	2026-09-11 08:02:50.126138+05:30
517	12	\N	2024-10-30	14	t	t	\N	Fractions	Geometry	Alphabets	Essay writing	t	\N	Good preparation	Not Matched	94	Not Uptodate	More than required	5	3	5	4	5	2	4	3	f	t	t	f	t	t	t	23	t	t	f	f	t	\N	Overall good progress. Keep it up.	2026-09-11 08:02:50.126138+05:30	2026-09-11 08:02:50.126138+05:30
518	12	\N	2024-12-21	31	t	t	\N	Basic Numbers	Percentages	Reading	Vocabulary	t	\N	Adequate material ready	Not Matched	84	Upto Date	More than required	5	2	3	4	2	4	5	3	t	t	t	f	t	f	t	28	t	t	t	t	t	\N	Attendance needs improvement.	2026-09-11 08:02:50.126138+05:30	2026-09-11 08:02:50.126138+05:30
519	12	\N	2025-01-29	15	f	t	Teacher absent	Addition, Subtraction	Percentages	Reading	Comprehension	f	\N	Good preparation	Not Matched	77	Partial Upto Date	Sufficient	5	3	2	2	3	5	5	4	t	f	t	t	t	f	t	22	f	t	t	t	f	\N	Overall good progress. Keep it up.	2026-09-11 08:02:50.126138+05:30	2026-09-11 08:02:50.126139+05:30
520	12	\N	2025-04-29	25	t	t	\N	Multiplication	Algebra basics	Reading	Essay writing	t	\N	Good preparation	Matched	64	Partial Upto Date	More than required	5	4	3	2	4	2	3	5	f	t	t	t	f	t	t	14	f	f	t	t	t	\N	Overall good progress. Keep it up.	2026-09-11 08:02:50.126139+05:30	2026-09-11 08:02:50.126139+05:30
521	12	\N	2025-06-13	13	t	f	Teacher absent	Multiplication	Geometry	Simple words	Grammar	t	\N	Good preparation	Matched	47	Not Uptodate	Lacking	4	3	5	2	3	4	2	4	t	t	t	t	t	f	f	27	t	t	t	f	t	\N	Overall good progress. Keep it up.	2026-09-11 08:02:50.126139+05:30	2026-09-11 08:02:50.126139+05:30
522	12	\N	2025-07-28	16	t	t	\N	Multiplication	Geometry	Short sentences	Essay writing	t	\N	Some gaps in preparation	Not Matched	44	Not Uptodate	Lacking	4	5	3	5	5	2	4	5	f	t	t	t	t	t	t	30	t	t	f	t	f	\N	Academic performance is improving steadily.	2026-09-11 08:02:50.126139+05:30	2026-09-11 08:02:50.126139+05:30
523	12	\N	2025-09-17	23	t	f	Exam preparation	Addition, Subtraction	Geometry	Alphabets	Essay writing	t	\N	Good preparation	Not Matched	44	Partial Upto Date	More than required	2	4	4	4	3	3	4	2	t	f	t	f	f	t	f	26	f	t	t	t	f	\N	Excellent classroom environment.	2026-09-11 08:02:50.12614+05:30	2026-09-11 08:02:50.12614+05:30
524	12	\N	2025-11-05	11	t	t	\N	Multiplication	Percentages	Reading	Comprehension	t	\N	Some gaps in preparation	Not Matched	70	Not Uptodate	Sufficient	4	2	3	3	3	5	4	2	f	t	t	f	t	t	f	13	t	t	t	t	f	\N	Excellent classroom environment.	2026-09-11 08:02:50.12614+05:30	2026-09-11 08:02:50.12614+05:30
525	12	\N	2025-12-05	17	f	f	Weather disruption	Addition, Subtraction	Percentages	Reading	Essay writing	f	\N	Good preparation	Matched	86	Upto Date	Sufficient	3	2	2	4	5	2	5	3	t	t	f	f	t	t	t	8	t	t	t	t	t	\N	Excellent classroom environment.	2026-09-11 08:02:50.12614+05:30	2026-09-11 08:02:50.12614+05:30
526	12	\N	2025-12-31	34	t	t	\N	Multiplication	Geometry	Alphabets	Essay writing	f	\N	Some gaps in preparation	Not Matched	100	Upto Date	Lacking	5	5	3	4	2	4	3	2	t	t	t	t	t	t	f	28	t	f	f	f	f	\N	Overall good progress. Keep it up.	2026-09-11 08:02:50.126141+05:30	2026-09-11 08:02:50.126141+05:30
527	12	\N	2026-03-03	20	t	t	\N	Fractions	Percentages	Alphabets	Grammar	t	\N	Needs improvement in planning	Not Matched	62	Upto Date	Sufficient	5	5	3	2	3	5	2	5	t	f	t	t	t	t	t	25	f	t	t	f	t	\N	Students are engaged and motivated.	2026-09-11 08:02:50.126141+05:30	2026-09-11 08:02:50.126141+05:30
528	12	\N	2026-03-31	21	t	t	\N	Multiplication	Algebra basics	Simple words	Essay writing	t	\N	Teacher well prepared	Not Matched	87	Partial Upto Date	Sufficient	3	3	5	4	2	5	5	5	f	t	t	f	f	t	f	12	t	t	t	t	t	\N	Academic performance is improving steadily.	2026-09-11 08:02:50.126141+05:30	2026-09-11 08:02:50.126141+05:30
529	12	\N	2026-05-20	20	t	t	\N	Basic Numbers	Algebra basics	Reading	Vocabulary	t	\N	Teacher well prepared	Matched	88	Partial Upto Date	Sufficient	3	3	3	4	2	4	3	5	t	t	f	t	t	t	t	15	t	t	t	t	t	\N	Attendance needs improvement.	2026-09-11 08:02:50.126142+05:30	2026-09-11 08:02:50.126142+05:30
530	12	\N	2026-07-13	11	t	t	\N	Basic Numbers	Decimals	Short sentences	Comprehension	t	\N	Teacher well prepared	Not Matched	43	Not Uptodate	Lacking	2	4	2	4	4	4	4	5	t	f	t	t	t	t	f	23	t	t	t	t	f	\N	Need to focus more on English reading.	2026-09-11 08:02:50.126142+05:30	2026-09-11 08:02:50.126142+05:30
531	12	\N	2026-09-05	31	t	t	\N	Addition, Subtraction	Geometry	Short sentences	Essay writing	t	\N	Adequate material ready	Not Matched	55	Not Uptodate	Lacking	3	5	2	2	3	2	2	3	t	t	t	f	t	t	f	14	t	t	t	t	f	\N	Academic performance is improving steadily.	2026-09-11 08:02:50.126142+05:30	2026-09-11 08:02:50.126142+05:30
532	13	\N	2024-01-08	17	t	t	\N	Fractions	Algebra basics	Simple words	Essay writing	f	\N	Adequate material ready	Matched	81	Upto Date	Sufficient	2	2	4	4	4	2	4	3	t	t	t	t	f	f	t	16	t	f	t	f	t	\N	Teacher dedication is commendable.	2026-09-11 08:02:50.126142+05:30	2026-09-11 08:02:50.126143+05:30
533	13	\N	2024-02-17	30	t	t	\N	Fractions	Geometry	Reading	Comprehension	t	\N	Needs improvement in planning	Not Matched	49	Partial Upto Date	Sufficient	5	4	3	5	2	5	3	5	t	f	t	t	t	t	t	17	t	t	t	t	t	\N	Students are engaged and motivated.	2026-09-11 08:02:50.126143+05:30	2026-09-11 08:02:50.126143+05:30
534	13	\N	2024-04-15	30	t	t	\N	Basic Numbers	Algebra basics	Simple words	Grammar	t	\N	Teacher well prepared	Not Matched	41	Upto Date	Sufficient	2	3	3	2	4	3	2	2	f	t	t	t	t	t	f	26	f	f	t	t	t	\N	Overall good progress. Keep it up.	2026-09-11 08:02:50.126143+05:30	2026-09-11 08:02:50.126143+05:30
535	13	\N	2024-05-16	27	t	t	\N	Addition, Subtraction	Algebra basics	Alphabets	Grammar	t	\N	Good preparation	Not Matched	49	Upto Date	Sufficient	2	3	5	5	3	4	4	3	f	t	t	t	f	t	t	15	t	f	t	t	t	\N	Need to focus more on English reading.	2026-09-11 08:02:50.126143+05:30	2026-09-11 08:02:50.126144+05:30
536	13	\N	2024-06-24	11	f	f	Festival week	Multiplication	Decimals	Short sentences	Comprehension	t	\N	Needs improvement in planning	Not Matched	79	Partial Upto Date	Lacking	2	4	5	4	4	2	2	3	f	t	t	t	f	f	t	11	t	f	t	t	t	\N	Students are engaged and motivated.	2026-09-11 08:02:50.126144+05:30	2026-09-11 08:02:50.126144+05:30
537	13	\N	2024-08-12	25	f	t	Exam preparation	Basic Numbers	Decimals	Short sentences	Comprehension	f	\N	Needs improvement in planning	Not Matched	66	Not Uptodate	Lacking	5	3	5	2	5	3	2	3	t	t	f	t	t	t	t	9	f	t	f	f	t	\N	Need to focus more on English reading.	2026-09-11 08:02:50.126144+05:30	2026-09-11 08:02:50.126144+05:30
538	13	\N	2024-09-05	27	t	f	Exam preparation	Multiplication	Geometry	Simple words	Grammar	t	\N	Good preparation	Matched	64	Not Uptodate	Sufficient	5	4	2	2	2	5	3	2	t	t	t	t	f	t	t	23	t	t	t	t	f	\N	Teacher dedication is commendable.	2026-09-11 08:02:50.126144+05:30	2026-09-11 08:02:50.126144+05:30
539	13	\N	2024-10-17	32	t	f	Teacher absent	Fractions	Algebra basics	Simple words	Grammar	f	\N	Good preparation	Matched	72	Upto Date	Sufficient	5	5	5	4	4	3	5	3	t	t	t	f	t	t	t	15	t	f	f	t	t	\N	Academic performance is improving steadily.	2026-09-11 08:02:50.126145+05:30	2026-09-11 08:02:50.126145+05:30
540	13	\N	2024-11-27	30	t	t	\N	Basic Numbers	Decimals	Simple words	Grammar	f	\N	Teacher well prepared	Matched	57	Upto Date	Sufficient	2	4	4	2	3	4	3	2	t	t	f	t	t	t	t	15	t	f	t	t	f	\N	Overall good progress. Keep it up.	2026-09-11 08:02:50.126145+05:30	2026-09-11 08:02:50.126145+05:30
541	13	\N	2025-01-07	19	t	t	\N	Addition, Subtraction	Percentages	Short sentences	Vocabulary	t	\N	Adequate material ready	Not Matched	86	Partial Upto Date	Sufficient	2	4	5	2	3	2	5	5	t	f	t	t	t	f	t	30	t	t	t	t	t	\N	Excellent classroom environment.	2026-09-11 08:02:50.126145+05:30	2026-09-11 08:02:50.126145+05:30
542	13	\N	2025-03-04	30	t	t	\N	Fractions	Decimals	Simple words	Essay writing	t	\N	Some gaps in preparation	Not Matched	42	Not Uptodate	More than required	5	3	3	2	3	5	2	2	t	f	t	f	f	t	t	22	t	f	t	t	f	\N	Need to focus more on English reading.	2026-09-11 08:02:50.126146+05:30	2026-09-11 08:02:50.126146+05:30
543	13	\N	2025-03-31	34	t	t	\N	Basic Numbers	Percentages	Reading	Essay writing	f	\N	Teacher well prepared	Matched	100	Upto Date	More than required	5	2	4	4	5	5	3	5	t	f	f	t	t	t	f	29	t	f	t	f	t	\N	Students are engaged and motivated.	2026-09-11 08:02:50.126146+05:30	2026-09-11 08:02:50.126146+05:30
544	13	\N	2025-05-30	15	f	t	Exam preparation	Addition, Subtraction	Geometry	Reading	Vocabulary	t	\N	Adequate material ready	Not Matched	69	Not Uptodate	More than required	5	2	2	3	2	5	5	3	t	t	t	t	t	t	t	16	t	t	f	t	t	\N	Need to focus more on English reading.	2026-09-11 08:02:50.126146+05:30	2026-09-11 08:02:50.126146+05:30
545	13	\N	2025-07-17	34	t	f	Exam preparation	Addition, Subtraction	Percentages	Reading	Vocabulary	t	\N	Needs improvement in planning	Matched	100	Not Uptodate	Lacking	4	4	3	2	3	2	4	5	t	f	t	t	t	f	t	9	t	f	t	f	t	\N	Students are engaged and motivated.	2026-09-11 08:02:50.126146+05:30	2026-09-11 08:02:50.126147+05:30
546	13	\N	2025-08-28	25	t	t	\N	Multiplication	Decimals	Short sentences	Vocabulary	f	\N	Some gaps in preparation	Matched	44	Not Uptodate	More than required	3	4	4	2	3	5	3	5	f	t	f	t	t	t	f	12	t	t	t	t	t	\N	Attendance needs improvement.	2026-09-11 08:02:50.126147+05:30	2026-09-11 08:02:50.126147+05:30
547	13	\N	2025-10-04	29	t	f	Exam preparation	Multiplication	Percentages	Simple words	Comprehension	f	\N	Some gaps in preparation	Matched	63	Partial Upto Date	Sufficient	4	4	2	5	5	5	5	4	t	t	t	f	t	t	f	19	t	t	t	t	f	\N	Teacher dedication is commendable.	2026-09-11 08:02:50.126147+05:30	2026-09-11 08:02:50.126147+05:30
548	13	\N	2025-11-07	13	t	t	\N	Addition, Subtraction	Algebra basics	Alphabets	Grammar	t	\N	Teacher well prepared	Matched	71	Not Uptodate	More than required	2	5	2	4	5	3	3	5	t	t	f	f	t	f	f	21	f	t	f	t	f	\N	Academic performance is improving steadily.	2026-09-11 08:02:50.126147+05:30	2026-09-11 08:02:50.126148+05:30
549	13	\N	2026-01-04	31	t	t	\N	Fractions	Percentages	Reading	Comprehension	t	\N	Teacher well prepared	Matched	40	Upto Date	Sufficient	4	4	4	3	5	3	5	3	t	t	t	f	t	f	f	13	t	t	t	t	t	\N	Excellent classroom environment.	2026-09-11 08:02:50.126148+05:30	2026-09-11 08:02:50.126148+05:30
550	13	\N	2026-02-14	22	t	t	\N	Fractions	Geometry	Short sentences	Comprehension	t	\N	Good preparation	Not Matched	40	Not Uptodate	More than required	3	2	2	5	2	3	5	4	t	t	t	t	f	t	f	16	t	t	f	t	t	\N	Overall good progress. Keep it up.	2026-09-11 08:02:50.126148+05:30	2026-09-11 08:02:50.126148+05:30
551	13	\N	2026-03-19	13	t	t	\N	Multiplication	Percentages	Short sentences	Comprehension	t	\N	Teacher well prepared	Not Matched	98	Upto Date	Lacking	2	5	2	5	2	5	2	3	t	t	t	f	f	t	t	13	t	t	f	t	f	\N	Need to focus more on English reading.	2026-09-11 08:02:50.126148+05:30	2026-09-11 08:02:50.126148+05:30
552	13	\N	2026-05-07	27	t	t	\N	Addition, Subtraction	Geometry	Short sentences	Grammar	t	\N	Good preparation	Matched	73	Not Uptodate	Sufficient	3	4	2	3	2	4	3	3	t	t	t	t	t	t	f	22	t	t	t	t	t	\N	Need to focus more on English reading.	2026-09-11 08:02:50.126149+05:30	2026-09-11 08:02:50.126149+05:30
553	13	\N	2026-06-12	32	t	t	\N	Fractions	Decimals	Alphabets	Essay writing	t	\N	Needs improvement in planning	Not Matched	67	Partial Upto Date	Lacking	4	4	2	5	5	3	4	4	f	f	t	f	f	t	f	17	t	f	f	t	f	\N	Overall good progress. Keep it up.	2026-09-11 08:02:50.126149+05:30	2026-09-11 08:02:50.126149+05:30
554	13	\N	2026-07-24	23	t	f	Festival week	Fractions	Geometry	Alphabets	Comprehension	t	\N	Adequate material ready	Matched	89	Partial Upto Date	Sufficient	2	4	2	4	3	5	4	3	t	t	t	t	t	t	t	26	f	t	f	t	f	\N	Students are engaged and motivated.	2026-09-11 08:02:50.126149+05:30	2026-09-11 08:02:50.126149+05:30
\.


--
-- Data for Name: kutirs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.kutirs (id, name, kutir_type, cluster_id, district_id, village, street, state, pincode, teacher_id, donor_id, enrollment_5th, enrollment_8th, created_at, updated_at) FROM stdin;
1	Test_kutir	Seva Kutir	97	71	Sandalpur	\N	Madhya Pradesh	\N	\N	\N	20	30	2026-09-10 21:57:31.761989+05:30	2026-09-10 21:57:31.761994+05:30
2	Gram Shiksha Kutir Devpura	Shiksha Kutir	34	72	Devpura	Near Gram Panchayat	Madhya Pradesh	\N	\N	\N	30	11	2026-09-11 07:44:33.081784+05:30	2026-09-11 07:44:33.081787+05:30
3	Seva Kutir Pahadi	Seva Kutir	41	71	Pahadi	Main Road	Madhya Pradesh	\N	\N	\N	10	16	2026-09-11 07:44:33.081787+05:30	2026-09-11 07:44:33.081788+05:30
4	Shiksha Kutir Moravan	Shiksha Kutir	42	71	Moravan	Shivpuri Bypass	Madhya Pradesh	\N	\N	\N	17	15	2026-09-11 07:44:33.081788+05:30	2026-09-11 07:44:33.081788+05:30
5	Gram Kutir Tongra	Seva Kutir	44	71	Tongra	Near Temple	Madhya Pradesh	\N	\N	\N	14	11	2026-09-11 07:44:33.081789+05:30	2026-09-11 07:44:33.081789+05:30
6	Shiksha Kendra Magardha	Shiksha Kutir	43	63	Magardha	Forest Road	Madhya Pradesh	\N	\N	\N	27	10	2026-09-11 07:44:33.081789+05:30	2026-09-11 07:44:33.081789+05:30
7	Kutir Eklera	Seva Kutir	38	78	Eklera	Village Center	Madhya Pradesh	\N	\N	\N	28	21	2026-09-11 07:44:33.081789+05:30	2026-09-11 07:44:33.08179+05:30
8	Kantaphod Shiksha Kutir	Shiksha Kutir	46	78	Kantaphod	Near Anganwadi	Madhya Pradesh	\N	\N	\N	11	8	2026-09-11 07:44:33.08179+05:30	2026-09-11 07:44:33.08179+05:30
9	Mahi Seva Kutir	Seva Kutir	39	76	Mahi	Jhabua Road	Madhya Pradesh	\N	\N	\N	12	14	2026-09-11 07:44:33.08179+05:30	2026-09-11 07:44:33.08179+05:30
10	Chilakda Learning Center	Shiksha Kutir	37	64	Chilakda	Panchayat Bhawan	Madhya Pradesh	\N	\N	\N	17	24	2026-09-11 07:44:33.08179+05:30	2026-09-11 07:44:33.081791+05:30
11	Gata Non-Kutir Center	Non-Kutir	52	64	Gata	Tribal Area	Madhya Pradesh	\N	\N	\N	29	8	2026-09-11 07:44:33.081791+05:30	2026-09-11 07:44:33.081791+05:30
12	Murum Shiksha Kutir	Shiksha Kutir	51	62	Murum	Near School	Madhya Pradesh	\N	\N	\N	27	14	2026-09-11 07:44:33.081791+05:30	2026-09-11 07:44:33.081791+05:30
13	Semarkhero Seva Kutir	Seva Kutir	53	62	Semarkhero	Forest Colony	Madhya Pradesh	\N	\N	\N	30	25	2026-09-11 07:44:33.081791+05:30	2026-09-11 07:44:33.081792+05:30
\.


--
-- Data for Name: no_admit_reasons; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.no_admit_reasons (id, reason, created_at, updated_at) FROM stdin;
1	Got admission somewhere else	2026-09-10 19:40:00.807806+05:30	2026-09-10 19:40:00.807812+05:30
2	Parents refused	2026-09-10 19:40:11.76112+05:30	2026-09-10 19:40:11.761126+05:30
\.


--
-- Data for Name: no_exam_reasons; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.no_exam_reasons (id, reason, created_at, updated_at) FROM stdin;
1	Illness	2026-09-10 19:39:44.076863+05:30	2026-09-10 19:39:44.076867+05:30
2	Too far	2026-09-10 19:39:49.389979+05:30	2026-09-10 19:39:49.389984+05:30
\.


--
-- Data for Name: school_type_subject_subjects; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.school_type_subject_subjects (school_type_subject_id, subject_id) FROM stdin;
5	2
5	3
5	4
5	1
6	2
6	3
9	2
9	3
9	4
8	2
8	3
10	2
10	3
10	4
10	1
10	5
\.


--
-- Data for Name: school_type_subjects; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.school_type_subjects (id, school_type) FROM stdin;
5	EMRS
6	KSP
7	GNV
8	JNV
9	KGBV
10	MRS
\.


--
-- Data for Name: schools; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.schools (id, name, school_type, street, city, district_id, state, pincode, created_at, updated_at) FROM stdin;
1	EMRS Bhopal	EMRS	\N	\N	77	Madhya Pradesh	\N	2026-09-11 10:15:52.909021+05:30	2026-09-11 10:15:52.909027+05:30
2	Jawahar Navodaya Vidyalaya Shivpuri	JNV	\N	Shivpuri	72	Madhya Pradesh	473551	2026-09-11 15:16:51.75328+05:30	2026-09-11 15:16:51.75328+05:30
3	Eklavya Model Residential School Karahal	EMRS	\N	Karahal	72	Madhya Pradesh	476337	2026-09-11 15:16:51.75328+05:30	2026-09-11 15:16:51.75328+05:30
4	Kasturba Gandhi Balika Vidyalaya Shivpuri	KGBV	\N	Shivpuri	72	Madhya Pradesh	473551	2026-09-11 15:16:51.75328+05:30	2026-09-11 15:16:51.75328+05:30
5	Jawahar Navodaya Vidyalaya Sheopur	JNV	\N	Sheopur	71	Madhya Pradesh	476337	2026-09-11 15:16:51.75328+05:30	2026-09-11 15:16:51.75328+05:30
6	Eklavya Model Residential School Sheopur	EMRS	\N	Sheopur	71	Madhya Pradesh	476337	2026-09-11 15:16:51.75328+05:30	2026-09-11 15:16:51.75328+05:30
7	Kasturba Gandhi Balika Vidyalaya Sheopur	KGBV	\N	Sheopur	71	Madhya Pradesh	476337	2026-09-11 15:16:51.75328+05:30	2026-09-11 15:16:51.75328+05:30
8	Eklavya Model Residential School Alirajpur	EMRS	\N	Alirajpur	64	Madhya Pradesh	457887	2026-09-11 15:16:51.75328+05:30	2026-09-11 15:16:51.75328+05:30
9	Jawahar Navodaya Vidyalaya Alirajpur	JNV	\N	Alirajpur	64	Madhya Pradesh	457887	2026-09-11 15:16:51.75328+05:30	2026-09-11 15:16:51.75328+05:30
10	Kasturba Gandhi Balika Vidyalaya Alirajpur	KGBV	\N	Alirajpur	64	Madhya Pradesh	457887	2026-09-11 15:16:51.75328+05:30	2026-09-11 15:16:51.75328+05:30
11	Eklavya Model Residential School Jhabua	EMRS	\N	Jhabua	76	Madhya Pradesh	457661	2026-09-11 15:16:51.75328+05:30	2026-09-11 15:16:51.75328+05:30
12	Jawahar Navodaya Vidyalaya Jhabua	JNV	\N	Jhabua	76	Madhya Pradesh	457661	2026-09-11 15:16:51.75328+05:30	2026-09-11 15:16:51.75328+05:30
13	Model Residential School Petlawad	MRS	\N	Petlawad	76	Madhya Pradesh	457777	2026-09-11 15:16:51.75328+05:30	2026-09-11 15:16:51.75328+05:30
14	Jawahar Navodaya Vidyalaya Dewas	JNV	\N	Dewas	78	Madhya Pradesh	455001	2026-09-11 15:16:51.75328+05:30	2026-09-11 15:16:51.75328+05:30
15	Eklavya Model Residential School Kannod	EMRS	\N	Kannod	78	Madhya Pradesh	455332	2026-09-11 15:16:51.75328+05:30	2026-09-11 15:16:51.75328+05:30
16	Govt. Navodaya Vidyalaya Dewas	GNV	\N	Dewas	78	Madhya Pradesh	455001	2026-09-11 15:16:51.75328+05:30	2026-09-11 15:16:51.75328+05:30
17	Jawahar Navodaya Vidyalaya Seoni	JNV	\N	Seoni	63	Madhya Pradesh	480661	2026-09-11 15:16:51.75328+05:30	2026-09-11 15:16:51.75328+05:30
18	Eklavya Model Residential School Seoni	EMRS	\N	Seoni	63	Madhya Pradesh	480661	2026-09-11 15:16:51.75328+05:30	2026-09-11 15:16:51.75328+05:30
19	Kasturba Gandhi Balika Vidyalaya Seoni	KGBV	\N	Seoni	63	Madhya Pradesh	480661	2026-09-11 15:16:51.75328+05:30	2026-09-11 15:16:51.75328+05:30
20	Jawahar Navodaya Vidyalaya Balaghat	JNV	\N	Balaghat	62	Madhya Pradesh	481001	2026-09-11 15:16:51.75328+05:30	2026-09-11 15:16:51.75328+05:30
21	Eklavya Model Residential School Waraseoni	EMRS	\N	Waraseoni	62	Madhya Pradesh	481331	2026-09-11 15:16:51.75328+05:30	2026-09-11 15:16:51.75328+05:30
22	Jawahar Navodaya Vidyalaya Chhindwara	JNV	\N	Chhindwara	69	Madhya Pradesh	480001	2026-09-11 15:16:51.75328+05:30	2026-09-11 15:16:51.75328+05:30
23	Eklavya Model Residential School Tamia	EMRS	\N	Tamia	69	Madhya Pradesh	480559	2026-09-11 15:16:51.75328+05:30	2026-09-11 15:16:51.75328+05:30
24	Kasturba Shaala Patalkot	KSP	\N	Patalkot	69	Madhya Pradesh	480559	2026-09-11 15:16:51.75328+05:30	2026-09-11 15:16:51.75328+05:30
25	Jawahar Navodaya Vidyalaya Betul	JNV	\N	Betul	68	Madhya Pradesh	460001	2026-09-11 15:16:51.75328+05:30	2026-09-11 15:16:51.75328+05:30
26	Eklavya Model Residential School Bhimpur	EMRS	\N	Bhimpur	68	Madhya Pradesh	460440	2026-09-11 15:16:51.75328+05:30	2026-09-11 15:16:51.75328+05:30
27	Eklavya Model Residential School Dindori	EMRS	\N	Dindori	80	Madhya Pradesh	481880	2026-09-11 15:16:51.75328+05:30	2026-09-11 15:16:51.75328+05:30
28	Jawahar Navodaya Vidyalaya Dindori	JNV	\N	Dindori	80	Madhya Pradesh	481880	2026-09-11 15:16:51.75328+05:30	2026-09-11 15:16:51.75328+05:30
29	Eklavya Model Residential School Rajendragram	EMRS	\N	Rajendragram	67	Madhya Pradesh	484224	2026-09-11 15:16:51.75328+05:30	2026-09-11 15:16:51.75328+05:30
30	Jawahar Navodaya Vidyalaya Anuppur	JNV	\N	Anuppur	67	Madhya Pradesh	484224	2026-09-11 15:16:51.75328+05:30	2026-09-11 15:16:51.75328+05:30
31	Eklavya Model Residential School Barwani	EMRS	\N	Barwani	77	Madhya Pradesh	451551	2026-09-11 15:16:51.75328+05:30	2026-09-11 15:16:51.75328+05:30
32	Jawahar Navodaya Vidyalaya Barwani	JNV	\N	Barwani	77	Madhya Pradesh	451551	2026-09-11 15:16:51.75328+05:30	2026-09-11 15:16:51.75328+05:30
33	Jawahar Navodaya Vidyalaya Sidhi	JNV	\N	Sidhi	82	Madhya Pradesh	486661	2026-09-11 15:16:51.75328+05:30	2026-09-11 15:16:51.75328+05:30
34	Eklavya Model Residential School Sidhi	EMRS	\N	Sidhi	82	Madhya Pradesh	486661	2026-09-11 15:16:51.75328+05:30	2026-09-11 15:16:51.75328+05:30
35	Jawahar Navodaya Vidyalaya Shahdol	JNV	\N	Shahdol	81	Madhya Pradesh	484001	2026-09-11 15:16:51.75328+05:30	2026-09-11 15:16:51.75328+05:30
36	Eklavya Model Residential School Shahdol	EMRS	\N	Shahdol	81	Madhya Pradesh	484001	2026-09-11 15:16:51.75328+05:30	2026-09-11 15:16:51.75328+05:30
37	Eklavya Model Residential School Khargone	EMRS	\N	Khargone	79	Madhya Pradesh	451001	2026-09-11 15:16:51.75328+05:30	2026-09-11 15:16:51.75328+05:30
38	Jawahar Navodaya Vidyalaya Khargone	JNV	\N	Khargone	79	Madhya Pradesh	451001	2026-09-11 15:16:51.75328+05:30	2026-09-11 15:16:51.75328+05:30
39	Eklavya Model Residential School Mawai	EMRS	\N	Mawai	87	Madhya Pradesh	481661	2026-09-11 15:16:51.75328+05:30	2026-09-11 15:16:51.75328+05:30
40	Jawahar Navodaya Vidyalaya Mandla	JNV	\N	Mandla	87	Madhya Pradesh	481661	2026-09-11 15:16:51.75328+05:30	2026-09-11 15:16:51.75328+05:30
41	Eklavya Model Residential School Dhar	EMRS	\N	Dhar	84	Madhya Pradesh	454001	2026-09-11 15:16:51.75328+05:30	2026-09-11 15:16:51.75328+05:30
42	Jawahar Navodaya Vidyalaya Dhar	JNV	\N	Dhar	84	Madhya Pradesh	454001	2026-09-11 15:16:51.75328+05:30	2026-09-11 15:16:51.75328+05:30
43	Govt. Sports Residential School Shivpuri (Boys)	SportsBoys	\N	Shivpuri	72	Madhya Pradesh	473551	2026-09-11 15:16:51.75328+05:30	2026-09-11 15:16:51.75328+05:30
44	Govt. Sports Residential School Shivpuri (Girls)	SportsGirls	\N	Shivpuri	72	Madhya Pradesh	473551	2026-09-11 15:16:51.75328+05:30	2026-09-11 15:16:51.75328+05:30
45	Eklavya Model Residential School Khalwa	EMRS	\N	Khalwa	66	Madhya Pradesh	450331	2026-09-11 15:16:51.75328+05:30	2026-09-11 15:16:51.75328+05:30
46	Jawahar Navodaya Vidyalaya Khandwa	JNV	\N	Khandwa	66	Madhya Pradesh	450001	2026-09-11 15:16:51.75328+05:30	2026-09-11 15:16:51.75328+05:30
\.


--
-- Data for Name: student_exam_scores; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.student_exam_scores (id, exam_id, subject_id, score) FROM stdin;
\.


--
-- Data for Name: student_exams; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.student_exams (id, student_id, school_id, school_start_year, eligible, form_received, applied, appeared, selected, admitted, admitted_school_id, no_admit_reason_id, exam_category_id, application_number, exam_center_id, roll_number, no_exam_reason_id, math, english, reasoning, evs, created_at, updated_at) FROM stdin;
9	2	1	2026	t	t	t	t	t	f	\N	2	4	56576	2	787	\N	30.00	78.00	45.00	40.00	2026-09-11 14:20:31.889428+05:30	2026-09-11 14:20:31.889433+05:30
14	1	1	2025	t	t	t	t	t	f	\N	1	4	3435	2	5656	\N	34.00	45.00	56.00	23.00	2026-09-11 14:23:05.946694+05:30	2026-09-11 14:23:05.946698+05:30
30	28	1	2024	t	t	t	t	t	t	1	\N	4	GRS/2024/1001	2	202402230	\N	13.35	27.66	23.37	14.55	2026-09-11 15:14:22.639801+05:30	2026-09-11 15:14:22.639801+05:30
31	29	1	2024	t	t	t	f	f	f	\N	\N	5	GRS/2024/1002	2	\N	1	\N	\N	\N	\N	2026-09-11 15:14:22.639801+05:30	2026-09-11 15:14:22.639801+05:30
32	30	1	2024	t	t	t	t	f	f	\N	\N	4	GRS/2024/1003	2	202402782	\N	28.18	25.92	22.63	18.79	2026-09-11 15:14:22.639801+05:30	2026-09-11 15:14:22.639801+05:30
33	31	1	2024	t	t	t	t	t	f	\N	1	4	GRS/2024/1004	2	202402919	\N	13.85	25.60	23.03	12.88	2026-09-11 15:14:22.639801+05:30	2026-09-11 15:14:22.639801+05:30
34	32	1	2024	t	t	t	t	f	f	\N	\N	5	GRS/2024/1005	2	202402921	\N	26.59	27.63	8.42	16.84	2026-09-11 15:14:22.639801+05:30	2026-09-11 15:14:22.639801+05:30
35	33	1	2024	t	t	t	t	t	t	1	\N	5	GRS/2024/1006	2	202402979	\N	24.06	24.70	12.22	9.91	2026-09-11 15:14:22.639801+05:30	2026-09-11 15:14:22.639801+05:30
36	34	1	2024	t	t	t	f	f	f	\N	\N	4	GRS/2024/1007	2	\N	2	\N	\N	\N	\N	2026-09-11 15:14:22.639801+05:30	2026-09-11 15:14:22.639801+05:30
37	35	1	2024	t	t	t	t	f	f	\N	\N	4	GRS/2024/1008	2	202402124	\N	26.70	19.21	13.19	17.54	2026-09-11 15:14:22.639801+05:30	2026-09-11 15:14:22.639801+05:30
38	36	1	2024	t	f	f	f	f	f	\N	\N	4	\N	\N	\N	\N	\N	\N	\N	\N	2026-09-11 15:14:22.639801+05:30	2026-09-11 15:14:22.639801+05:30
39	37	1	2024	t	t	t	t	t	t	1	\N	5	GRS/2024/1009	2	202402218	\N	17.91	27.29	24.44	11.35	2026-09-11 15:14:22.639801+05:30	2026-09-11 15:14:22.639801+05:30
40	38	1	2024	t	t	t	t	t	f	\N	1	4	GRS/2024/1010	2	202402453	\N	27.79	15.22	17.87	19.80	2026-09-11 15:14:22.639801+05:30	2026-09-11 15:14:22.639801+05:30
41	39	1	2024	t	t	f	f	f	f	\N	\N	5	\N	\N	\N	\N	\N	\N	\N	\N	2026-09-11 15:14:22.639801+05:30	2026-09-11 15:14:22.639801+05:30
42	40	1	2024	t	t	t	t	t	t	1	\N	4	GRS/2024/1011	2	202402101	\N	22.91	20.23	14.55	14.92	2026-09-11 15:14:22.639801+05:30	2026-09-11 15:14:22.639801+05:30
43	41	1	2024	t	t	t	t	t	t	1	\N	5	GRS/2024/1012	2	202402171	\N	21.36	26.13	19.68	19.28	2026-09-11 15:14:22.639801+05:30	2026-09-11 15:14:22.639801+05:30
44	42	1	2024	t	f	f	f	f	f	\N	\N	5	\N	\N	\N	\N	\N	\N	\N	\N	2026-09-11 15:14:22.639801+05:30	2026-09-11 15:14:22.639801+05:30
45	28	1	2025	t	t	t	f	f	f	\N	\N	4	GRS/2025/1013	2	\N	\N	\N	\N	\N	\N	2026-09-11 15:14:22.639801+05:30	2026-09-11 15:14:22.639801+05:30
46	29	1	2025	t	t	t	t	f	f	\N	\N	5	GRS/2025/1014	2	202502552	\N	20.50	27.01	14.56	10.52	2026-09-11 15:14:22.639801+05:30	2026-09-11 15:14:22.639801+05:30
47	30	1	2025	t	t	t	t	t	t	1	\N	4	GRS/2025/1015	2	202502627	\N	21.07	15.85	17.10	18.81	2026-09-11 15:14:22.639801+05:30	2026-09-11 15:14:22.639801+05:30
48	31	1	2025	t	f	f	f	f	f	\N	\N	5	\N	\N	\N	\N	\N	\N	\N	\N	2026-09-11 15:14:22.639801+05:30	2026-09-11 15:14:22.639801+05:30
49	32	1	2025	t	t	t	t	f	f	\N	\N	4	GRS/2025/1016	2	202502125	\N	27.09	25.52	20.09	10.70	2026-09-11 15:14:22.639801+05:30	2026-09-11 15:14:22.639801+05:30
50	33	1	2025	t	t	t	t	t	f	\N	2	5	GRS/2025/1017	2	202502835	\N	14.74	29.71	19.17	17.22	2026-09-11 15:14:22.639801+05:30	2026-09-11 15:14:22.639801+05:30
51	34	1	2025	t	t	t	t	t	t	1	\N	4	GRS/2025/1018	2	202502324	\N	25.14	20.90	13.66	15.87	2026-09-11 15:14:22.639801+05:30	2026-09-11 15:14:22.639801+05:30
52	35	1	2025	t	t	t	t	f	f	\N	\N	4	GRS/2025/1019	2	202502567	\N	16.81	29.24	17.77	8.60	2026-09-11 15:14:22.639801+05:30	2026-09-11 15:14:22.639801+05:30
53	36	1	2025	t	f	f	f	f	f	\N	\N	4	\N	\N	\N	\N	\N	\N	\N	\N	2026-09-11 15:14:22.639801+05:30	2026-09-11 15:14:22.639801+05:30
54	37	1	2025	t	t	t	f	f	f	\N	\N	5	GRS/2025/1020	2	\N	\N	\N	\N	\N	\N	2026-09-11 15:14:22.639801+05:30	2026-09-11 15:14:22.639801+05:30
55	38	1	2025	t	t	t	t	t	f	\N	2	4	GRS/2025/1021	2	202502560	\N	23.80	24.95	17.57	17.97	2026-09-11 15:14:22.639801+05:30	2026-09-11 15:14:22.639801+05:30
56	39	1	2025	t	t	t	t	t	t	1	\N	4	GRS/2025/1022	2	202502550	\N	18.15	16.45	19.56	17.19	2026-09-11 15:14:22.639801+05:30	2026-09-11 15:14:22.639801+05:30
57	40	1	2025	t	t	f	f	f	f	\N	\N	4	\N	\N	\N	\N	\N	\N	\N	\N	2026-09-11 15:14:22.639801+05:30	2026-09-11 15:14:22.639801+05:30
58	28	1	2026	t	f	f	f	f	f	\N	\N	5	\N	\N	\N	\N	\N	\N	\N	\N	2026-09-11 15:14:22.639801+05:30	2026-09-11 15:14:22.639801+05:30
59	29	1	2026	t	t	t	t	f	f	\N	\N	5	GRS/2026/1023	2	202602977	\N	19.96	20.39	10.93	17.99	2026-09-11 15:14:22.639801+05:30	2026-09-11 15:14:22.639801+05:30
60	30	1	2026	t	t	t	f	f	f	\N	\N	5	GRS/2026/1024	2	\N	\N	\N	\N	\N	\N	2026-09-11 15:14:22.639801+05:30	2026-09-11 15:14:22.639801+05:30
61	31	1	2026	t	f	f	f	f	f	\N	\N	4	\N	\N	\N	\N	\N	\N	\N	\N	2026-09-11 15:14:22.639801+05:30	2026-09-11 15:14:22.639801+05:30
62	32	1	2026	t	f	f	f	f	f	\N	\N	5	\N	\N	\N	\N	\N	\N	\N	\N	2026-09-11 15:14:22.639801+05:30	2026-09-11 15:14:22.639801+05:30
63	33	1	2026	t	t	t	f	f	f	\N	\N	5	GRS/2026/1025	2	\N	\N	\N	\N	\N	\N	2026-09-11 15:14:22.639801+05:30	2026-09-11 15:14:22.639801+05:30
64	34	1	2026	t	t	f	f	f	f	\N	\N	5	\N	\N	\N	\N	\N	\N	\N	\N	2026-09-11 15:14:22.639801+05:30	2026-09-11 15:14:22.639801+05:30
65	35	1	2026	t	t	t	t	f	f	\N	\N	5	GRS/2026/1026	2	202602960	\N	19.09	20.74	15.83	16.03	2026-09-11 15:14:22.639801+05:30	2026-09-11 15:14:22.639801+05:30
66	36	1	2026	t	t	t	t	f	f	\N	\N	5	GRS/2026/1027	2	202602185	\N	22.01	14.30	19.33	8.32	2026-09-11 15:14:22.639801+05:30	2026-09-11 15:14:22.639801+05:30
67	37	1	2026	t	t	f	f	f	f	\N	\N	5	\N	\N	\N	\N	\N	\N	\N	\N	2026-09-11 15:14:22.639801+05:30	2026-09-11 15:14:22.639801+05:30
68	38	1	2026	t	f	f	f	f	f	\N	\N	5	\N	\N	\N	\N	\N	\N	\N	\N	2026-09-11 15:14:22.639801+05:30	2026-09-11 15:14:22.639801+05:30
69	39	1	2026	t	t	t	f	f	f	\N	\N	4	GRS/2026/1028	2	\N	\N	\N	\N	\N	\N	2026-09-11 15:14:22.639801+05:30	2026-09-11 15:14:22.639801+05:30
70	40	1	2026	t	t	t	f	f	f	\N	\N	5	GRS/2026/1029	2	\N	\N	\N	\N	\N	\N	2026-09-11 15:14:22.639801+05:30	2026-09-11 15:14:22.639801+05:30
71	41	1	2026	t	t	t	t	f	f	\N	\N	5	GRS/2026/1030	2	202602954	\N	18.17	17.88	21.42	12.55	2026-09-11 15:14:22.639801+05:30	2026-09-11 15:14:22.639801+05:30
\.


--
-- Data for Name: student_progress; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.student_progress (id, student_id, school_id, academic_year, grade, is_enrolled, exit_reason, previous_year_percentage, remarks, created_at, updated_at) FROM stdin;
1	34	1	2025	6	t	\N	56.00	\N	2026-09-11 15:33:56.395451+05:30	2026-09-11 15:33:56.395457+05:30
2	50	1	2026	6	t	\N	45.00	\N	2026-09-11 15:38:19.058785+05:30	2026-09-11 15:38:19.058796+05:30
4	40	1	2026	6	t	\N	45.00	\N	2026-09-11 15:41:23.361667+05:30	2026-09-11 15:41:23.361673+05:30
\.


--
-- Data for Name: students; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.students (id, kutir_id, first_name, last_name, photo, gender, dob, street, pincode, phone, email, father_name, mother_name, category_id, sub_category_id, alt_contact_name, alt_contact_phone, aadhaar, category_cert, birth_cert, residence_proof, medical, created_at, updated_at) FROM stdin;
1	\N	Dinesh	Goyal	\N	Boy	1964-09-03	\N	\N	4084210469	\N	adf	asdf	\N	\N	\N	\N	f	f	f	f	f	2026-09-10 17:56:48.395217+05:30	2026-09-10 17:56:48.395226+05:30
2	1	test	testss	\N	Boy	2026-09-01	\N	\N	345435	dsfa@abc.com	asdfas	asdfasdf	6	1	namas	34535	f	t	t	f	f	2026-09-11 13:41:52.267231+05:30	2026-09-11 13:41:52.267238+05:30
28	4	Ajay	Verma	\N	Boy	2013-03-24	\N	\N	9210053353	\N	Ramchandra Verma	Kiran Verma	4	1	\N	\N	t	t	f	t	f	2026-09-11 15:14:22.639801+05:30	2026-09-11 15:14:22.639801+05:30
29	12	Deepak	Singh	\N	Boy	2013-11-23	\N	\N	9685126461	\N	Devendra Singh	Durga Singh	1	1	\N	\N	t	t	t	t	t	2026-09-11 15:14:22.639801+05:30	2026-09-11 15:14:22.639801+05:30
30	4	Suresh	Gond	\N	Boy	2013-06-04	\N	\N	9199585092	\N	Rajesh Gond	Sarita Gond	4	1	\N	\N	t	t	t	t	f	2026-09-11 15:14:22.639801+05:30	2026-09-11 15:14:22.639801+05:30
31	11	Pooja	Chouhan	\N	Girl	2013-10-28	\N	\N	9488302652	\N	Sitaram Chouhan	Sunita Chouhan	1	1	\N	\N	t	t	f	f	f	2026-09-11 15:14:22.639801+05:30	2026-09-11 15:14:22.639801+05:30
32	5	Sunita	Rajput	\N	Girl	2013-08-21	\N	\N	9995619255	\N	Harish Rajput	Usha Rajput	1	1	\N	\N	t	t	t	t	t	2026-09-11 15:14:22.639801+05:30	2026-09-11 15:14:22.639801+05:30
33	3	Ajay	Verma	\N	Boy	2013-08-13	\N	\N	9389854268	\N	Narendra Verma	Rekha Verma	2	1	\N	\N	t	t	t	t	t	2026-09-11 15:14:22.639801+05:30	2026-09-11 15:14:22.639801+05:30
34	7	Dinesh	Sharma	\N	Boy	2013-05-03	\N	\N	9326541099	\N	Harish Sharma	Usha Sharma	1	1	\N	\N	t	t	t	f	t	2026-09-11 15:14:22.639801+05:30	2026-09-11 15:14:22.639801+05:30
35	4	Vinod	Baiga	\N	Boy	2013-12-18	\N	\N	9678722458	\N	Ganesh Baiga	Shakuntala Baiga	4	1	\N	\N	t	t	t	t	f	2026-09-11 15:14:22.639801+05:30	2026-09-11 15:14:22.639801+05:30
36	3	Geeta	Chouhan	\N	Girl	2013-11-06	\N	\N	9950488739	\N	Ganesh Chouhan	Kamla Chouhan	1	1	\N	\N	t	t	t	t	t	2026-09-11 15:14:22.639801+05:30	2026-09-11 15:14:22.639801+05:30
37	13	Rekha	Chouhan	\N	Girl	2013-11-11	\N	\N	9219778234	\N	Kailash Chouhan	Savitri Chouhan	1	1	\N	\N	t	f	f	t	t	2026-09-11 15:14:22.639801+05:30	2026-09-11 15:14:22.639801+05:30
38	11	Anil	Sahu	\N	Boy	2013-09-20	\N	\N	9313579170	\N	Bhagwan Sahu	Radha Sahu	1	1	\N	\N	t	t	t	t	t	2026-09-11 15:14:22.639801+05:30	2026-09-11 15:14:22.639801+05:30
39	6	Rahul	Meena	\N	Boy	2013-05-08	\N	\N	9162196678	\N	Mahesh Meena	Meera Meena	1	1	\N	\N	t	t	f	t	t	2026-09-11 15:14:22.639801+05:30	2026-09-11 15:14:22.639801+05:30
40	9	Dinesh	Chouhan	\N	Boy	2013-03-09	\N	\N	9666585408	\N	Tulsiram Chouhan	Shakuntala Chouhan	2	1	\N	\N	t	t	t	t	t	2026-09-11 15:14:22.639801+05:30	2026-09-11 15:14:22.639801+05:30
41	9	Kavita	Gond	\N	Girl	2013-08-04	\N	\N	9366186631	\N	Suresh Gond	Sunita Gond	4	1	\N	\N	t	t	t	f	f	2026-09-11 15:14:22.639801+05:30	2026-09-11 15:14:22.639801+05:30
42	1	Sunita	Gond	\N	Girl	2013-06-03	\N	\N	9652070932	\N	Shivlal Gond	Savitri Gond	2	1	\N	\N	t	t	t	f	t	2026-09-11 15:14:22.639801+05:30	2026-09-11 15:14:22.639801+05:30
43	4	Ravi	Meena	\N	Boy	2013-02-04	\N	\N	9807577342	\N	Ganesh Meena	Laxmi Meena	6	1	\N	\N	t	t	t	t	t	2026-09-11 15:14:22.639801+05:30	2026-09-11 15:14:22.639801+05:30
44	4	Ajay	Verma	\N	Boy	2013-04-07	\N	\N	9675832441	\N	Ramchandra Verma	Sunita Verma	4	1	\N	\N	t	t	t	f	t	2026-09-11 15:14:22.639801+05:30	2026-09-11 15:14:22.639801+05:30
45	11	Santosh	Sahu	\N	Boy	2013-09-27	\N	\N	9115846122	\N	Kailash Sahu	Usha Sahu	1	1	\N	\N	t	t	t	f	t	2026-09-11 15:14:22.639801+05:30	2026-09-11 15:14:22.639801+05:30
46	1	Kavita	Rajput	\N	Girl	2013-07-09	\N	\N	9941889393	\N	Rajesh Rajput	Savitri Rajput	2	1	\N	\N	t	t	t	t	t	2026-09-11 15:14:22.639801+05:30	2026-09-11 15:14:22.639801+05:30
47	4	Suman	Gond	\N	Girl	2013-01-19	\N	\N	9889991777	\N	Ganesh Gond	Shakuntala Gond	2	1	\N	\N	t	t	f	t	t	2026-09-11 15:14:22.639801+05:30	2026-09-11 15:14:22.639801+05:30
48	2	Mohan	Chouhan	\N	Boy	2013-10-03	\N	\N	9825003955	\N	Bhagwan Chouhan	Savitri Chouhan	1	1	\N	\N	t	t	t	t	t	2026-09-11 15:14:22.639801+05:30	2026-09-11 15:14:22.639801+05:30
49	4	Rahul	Meena	\N	Boy	2013-11-23	\N	\N	9437352358	\N	Sitaram Meena	Sunita Meena	4	1	\N	\N	t	t	t	t	t	2026-09-11 15:14:22.639801+05:30	2026-09-11 15:14:22.639801+05:30
50	9	Dinesh	Verma	\N	Boy	2013-04-17	\N	\N	9384756779	\N	Ramchandra Verma	Meera Verma	1	1	\N	\N	t	t	f	f	f	2026-09-11 15:14:22.639801+05:30	2026-09-11 15:14:22.639801+05:30
51	11	Pooja	Rajput	\N	Girl	2013-09-10	\N	\N	9812308209	\N	Devendra Rajput	Kiran Rajput	4	1	\N	\N	t	t	t	t	t	2026-09-11 15:14:22.639801+05:30	2026-09-11 15:14:22.639801+05:30
52	4	Geeta	Yadav	\N	Girl	2013-11-21	\N	\N	9383450553	\N	Suresh Yadav	Durga Yadav	2	1	\N	\N	t	t	t	f	t	2026-09-11 15:14:22.639801+05:30	2026-09-11 15:14:22.639801+05:30
\.


--
-- Data for Name: sub_categories; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sub_categories (id, name, code, category_id, created_at, updated_at) FROM stdin;
1	DNT	\N	6	2026-09-10 19:33:08.293127+05:30	2026-09-10 19:33:08.293132+05:30
\.


--
-- Data for Name: subjects; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.subjects (id, name, code, created_at, updated_at) FROM stdin;
1	Math	\N	2026-09-10 19:40:19.02578+05:30	2026-09-10 19:40:19.025786+05:30
2	EVS	\N	2026-09-10 19:40:22.643433+05:30	2026-09-10 19:40:22.643439+05:30
3	English	\N	2026-09-10 19:40:26.739531+05:30	2026-09-10 19:40:26.739536+05:30
4	Hindi	\N	2026-09-10 19:40:31.705428+05:30	2026-09-10 19:40:31.705433+05:30
5	Reasoning	\N	2026-09-10 19:40:36.860244+05:30	2026-09-10 19:40:36.860248+05:30
\.


--
-- Data for Name: user_areas; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_areas (user_id, area_id) FROM stdin;
\.


--
-- Data for Name: user_clusters; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_clusters (user_id, cluster_id) FROM stdin;
\.


--
-- Data for Name: user_districts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_districts (user_id, district_id) FROM stdin;
\.


--
-- Data for Name: user_kutirs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_kutirs (user_id, kutir_id) FROM stdin;
\.


--
-- Data for Name: user_zones; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_zones (user_id, zone_id) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, username, email, first_name, last_name, phone, title, password, is_active, is_superuser, created_at, updated_at) FROM stdin;
1	admin	admin@kutirgrs.local	\N	\N	\N	Admin	$2b$12$uN.liaNH0EGt7xdzc7uCJOCMW2aCrz750uATr6/2fPgwepOUiXga6	t	t	2026-09-10 16:08:52.841055+05:30	2026-09-10 16:08:52.841058+05:30
\.


--
-- Data for Name: zones; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.zones (id, name, code, created_at, updated_at, zonal_head_id) FROM stdin;
20	Dewas	\N	2026-09-10 18:17:40.60136+05:30	2026-09-10 18:17:40.601365+05:30	\N
21	Mandla	\N	2026-09-10 18:17:40.601365+05:30	2026-09-10 18:17:40.601366+05:30	\N
22	Sheopur	\N	2026-09-10 18:17:40.601366+05:30	2026-09-10 18:17:40.601366+05:30	\N
23	Barwani	\N	2026-09-10 18:17:40.601367+05:30	2026-09-10 18:17:40.601367+05:30	\N
24	Chhindwara	\N	2026-09-10 18:17:40.601367+05:30	2026-09-10 18:17:40.601367+05:30	\N
25	Sidhi	\N	2026-09-10 18:17:40.601367+05:30	2026-09-10 18:17:40.601368+05:30	\N
26	Anuppur	\N	2026-09-10 18:17:40.601368+05:30	2026-09-10 18:17:40.601368+05:30	\N
\.


--
-- Name: areas_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.areas_id_seq', 131, true);


--
-- Name: categories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.categories_id_seq', 8, true);


--
-- Name: clusters_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.clusters_id_seq', 109, true);


--
-- Name: districts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.districts_id_seq', 87, true);


--
-- Name: donors_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.donors_id_seq', 1, false);


--
-- Name: exam_categories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.exam_categories_id_seq', 5, true);


--
-- Name: exam_centers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.exam_centers_id_seq', 16, true);


--
-- Name: kutir_visits_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.kutir_visits_id_seq', 554, true);


--
-- Name: kutirs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.kutirs_id_seq', 13, true);


--
-- Name: no_admit_reasons_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.no_admit_reasons_id_seq', 2, true);


--
-- Name: no_exam_reasons_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.no_exam_reasons_id_seq', 2, true);


--
-- Name: school_type_subjects_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.school_type_subjects_id_seq', 10, true);


--
-- Name: schools_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.schools_id_seq', 46, true);


--
-- Name: student_exam_scores_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.student_exam_scores_id_seq', 1, false);


--
-- Name: student_exams_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.student_exams_id_seq', 71, true);


--
-- Name: student_progress_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.student_progress_id_seq', 4, true);


--
-- Name: students_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.students_id_seq', 52, true);


--
-- Name: sub_categories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.sub_categories_id_seq', 1, true);


--
-- Name: subjects_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.subjects_id_seq', 5, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.users_id_seq', 1, true);


--
-- Name: zones_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.zones_id_seq', 26, true);


--
-- Name: areas areas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.areas
    ADD CONSTRAINT areas_pkey PRIMARY KEY (id);


--
-- Name: categories categories_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_name_key UNIQUE (name);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: clusters clusters_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clusters
    ADD CONSTRAINT clusters_pkey PRIMARY KEY (id);


--
-- Name: districts districts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.districts
    ADD CONSTRAINT districts_pkey PRIMARY KEY (id);


--
-- Name: donors donors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.donors
    ADD CONSTRAINT donors_pkey PRIMARY KEY (id);


--
-- Name: exam_categories exam_categories_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_categories
    ADD CONSTRAINT exam_categories_name_key UNIQUE (name);


--
-- Name: exam_categories exam_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_categories
    ADD CONSTRAINT exam_categories_pkey PRIMARY KEY (id);


--
-- Name: exam_centers exam_centers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_centers
    ADD CONSTRAINT exam_centers_pkey PRIMARY KEY (id);


--
-- Name: kutir_visits kutir_visits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kutir_visits
    ADD CONSTRAINT kutir_visits_pkey PRIMARY KEY (id);


--
-- Name: kutirs kutirs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kutirs
    ADD CONSTRAINT kutirs_pkey PRIMARY KEY (id);


--
-- Name: no_admit_reasons no_admit_reasons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.no_admit_reasons
    ADD CONSTRAINT no_admit_reasons_pkey PRIMARY KEY (id);


--
-- Name: no_admit_reasons no_admit_reasons_reason_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.no_admit_reasons
    ADD CONSTRAINT no_admit_reasons_reason_key UNIQUE (reason);


--
-- Name: no_exam_reasons no_exam_reasons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.no_exam_reasons
    ADD CONSTRAINT no_exam_reasons_pkey PRIMARY KEY (id);


--
-- Name: no_exam_reasons no_exam_reasons_reason_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.no_exam_reasons
    ADD CONSTRAINT no_exam_reasons_reason_key UNIQUE (reason);


--
-- Name: school_type_subject_subjects school_type_subject_subjects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.school_type_subject_subjects
    ADD CONSTRAINT school_type_subject_subjects_pkey PRIMARY KEY (school_type_subject_id, subject_id);


--
-- Name: school_type_subjects school_type_subjects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.school_type_subjects
    ADD CONSTRAINT school_type_subjects_pkey PRIMARY KEY (id);


--
-- Name: school_type_subjects school_type_subjects_school_type_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.school_type_subjects
    ADD CONSTRAINT school_type_subjects_school_type_key UNIQUE (school_type);


--
-- Name: schools schools_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schools
    ADD CONSTRAINT schools_pkey PRIMARY KEY (id);


--
-- Name: student_exam_scores student_exam_scores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_exam_scores
    ADD CONSTRAINT student_exam_scores_pkey PRIMARY KEY (id);


--
-- Name: student_exams student_exams_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_exams
    ADD CONSTRAINT student_exams_pkey PRIMARY KEY (id);


--
-- Name: student_progress student_progress_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_progress
    ADD CONSTRAINT student_progress_pkey PRIMARY KEY (id);


--
-- Name: students students_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_pkey PRIMARY KEY (id);


--
-- Name: sub_categories sub_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sub_categories
    ADD CONSTRAINT sub_categories_pkey PRIMARY KEY (id);


--
-- Name: subjects subjects_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subjects
    ADD CONSTRAINT subjects_name_key UNIQUE (name);


--
-- Name: subjects subjects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subjects
    ADD CONSTRAINT subjects_pkey PRIMARY KEY (id);


--
-- Name: student_exam_scores uq_exam_subject; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_exam_scores
    ADD CONSTRAINT uq_exam_subject UNIQUE (exam_id, subject_id);


--
-- Name: student_progress uq_student_school_academic_year; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_progress
    ADD CONSTRAINT uq_student_school_academic_year UNIQUE (student_id, school_id, academic_year);


--
-- Name: student_exams uq_student_school_year; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_exams
    ADD CONSTRAINT uq_student_school_year UNIQUE (student_id, school_id, school_start_year);


--
-- Name: kutir_visits uq_visit_per_kutir_per_day; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kutir_visits
    ADD CONSTRAINT uq_visit_per_kutir_per_day UNIQUE (kutir_id, visit_date);


--
-- Name: user_areas user_areas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_areas
    ADD CONSTRAINT user_areas_pkey PRIMARY KEY (user_id, area_id);


--
-- Name: user_clusters user_clusters_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_clusters
    ADD CONSTRAINT user_clusters_pkey PRIMARY KEY (user_id, cluster_id);


--
-- Name: user_districts user_districts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_districts
    ADD CONSTRAINT user_districts_pkey PRIMARY KEY (user_id, district_id);


--
-- Name: user_kutirs user_kutirs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_kutirs
    ADD CONSTRAINT user_kutirs_pkey PRIMARY KEY (user_id, kutir_id);


--
-- Name: user_zones user_zones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_zones
    ADD CONSTRAINT user_zones_pkey PRIMARY KEY (user_id, zone_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: zones zones_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zones
    ADD CONSTRAINT zones_name_key UNIQUE (name);


--
-- Name: zones zones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zones
    ADD CONSTRAINT zones_pkey PRIMARY KEY (id);


--
-- Name: areas areas_district_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.areas
    ADD CONSTRAINT areas_district_id_fkey FOREIGN KEY (district_id) REFERENCES public.districts(id);


--
-- Name: areas areas_education_coordinator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.areas
    ADD CONSTRAINT areas_education_coordinator_id_fkey FOREIGN KEY (education_coordinator_id) REFERENCES public.users(id);


--
-- Name: clusters clusters_area_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clusters
    ADD CONSTRAINT clusters_area_id_fkey FOREIGN KEY (area_id) REFERENCES public.areas(id);


--
-- Name: clusters clusters_cluster_coordinator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clusters
    ADD CONSTRAINT clusters_cluster_coordinator_id_fkey FOREIGN KEY (cluster_coordinator_id) REFERENCES public.users(id);


--
-- Name: districts districts_district_anchor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.districts
    ADD CONSTRAINT districts_district_anchor_id_fkey FOREIGN KEY (district_anchor_id) REFERENCES public.users(id);


--
-- Name: districts districts_zone_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.districts
    ADD CONSTRAINT districts_zone_id_fkey FOREIGN KEY (zone_id) REFERENCES public.zones(id);


--
-- Name: exam_centers exam_centers_district_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_centers
    ADD CONSTRAINT exam_centers_district_id_fkey FOREIGN KEY (district_id) REFERENCES public.districts(id);


--
-- Name: kutir_visits kutir_visits_kutir_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kutir_visits
    ADD CONSTRAINT kutir_visits_kutir_id_fkey FOREIGN KEY (kutir_id) REFERENCES public.kutirs(id) ON DELETE CASCADE;


--
-- Name: kutir_visits kutir_visits_visited_by_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kutir_visits
    ADD CONSTRAINT kutir_visits_visited_by_id_fkey FOREIGN KEY (visited_by_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: kutirs kutirs_cluster_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kutirs
    ADD CONSTRAINT kutirs_cluster_id_fkey FOREIGN KEY (cluster_id) REFERENCES public.clusters(id);


--
-- Name: kutirs kutirs_district_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kutirs
    ADD CONSTRAINT kutirs_district_id_fkey FOREIGN KEY (district_id) REFERENCES public.districts(id);


--
-- Name: kutirs kutirs_donor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kutirs
    ADD CONSTRAINT kutirs_donor_id_fkey FOREIGN KEY (donor_id) REFERENCES public.donors(id);


--
-- Name: kutirs kutirs_teacher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kutirs
    ADD CONSTRAINT kutirs_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.users(id);


--
-- Name: school_type_subject_subjects school_type_subject_subjects_school_type_subject_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.school_type_subject_subjects
    ADD CONSTRAINT school_type_subject_subjects_school_type_subject_id_fkey FOREIGN KEY (school_type_subject_id) REFERENCES public.school_type_subjects(id) ON DELETE CASCADE;


--
-- Name: school_type_subject_subjects school_type_subject_subjects_subject_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.school_type_subject_subjects
    ADD CONSTRAINT school_type_subject_subjects_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.subjects(id) ON DELETE CASCADE;


--
-- Name: schools schools_district_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schools
    ADD CONSTRAINT schools_district_id_fkey FOREIGN KEY (district_id) REFERENCES public.districts(id);


--
-- Name: student_exam_scores student_exam_scores_exam_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_exam_scores
    ADD CONSTRAINT student_exam_scores_exam_id_fkey FOREIGN KEY (exam_id) REFERENCES public.student_exams(id) ON DELETE CASCADE;


--
-- Name: student_exam_scores student_exam_scores_subject_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_exam_scores
    ADD CONSTRAINT student_exam_scores_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.subjects(id) ON DELETE CASCADE;


--
-- Name: student_exams student_exams_admitted_school_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_exams
    ADD CONSTRAINT student_exams_admitted_school_id_fkey FOREIGN KEY (admitted_school_id) REFERENCES public.schools(id) ON DELETE SET NULL;


--
-- Name: student_exams student_exams_exam_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_exams
    ADD CONSTRAINT student_exams_exam_category_id_fkey FOREIGN KEY (exam_category_id) REFERENCES public.exam_categories(id) ON DELETE SET NULL;


--
-- Name: student_exams student_exams_exam_center_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_exams
    ADD CONSTRAINT student_exams_exam_center_id_fkey FOREIGN KEY (exam_center_id) REFERENCES public.exam_centers(id) ON DELETE SET NULL;


--
-- Name: student_exams student_exams_no_admit_reason_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_exams
    ADD CONSTRAINT student_exams_no_admit_reason_id_fkey FOREIGN KEY (no_admit_reason_id) REFERENCES public.no_admit_reasons(id) ON DELETE SET NULL;


--
-- Name: student_exams student_exams_no_exam_reason_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_exams
    ADD CONSTRAINT student_exams_no_exam_reason_id_fkey FOREIGN KEY (no_exam_reason_id) REFERENCES public.no_exam_reasons(id) ON DELETE SET NULL;


--
-- Name: student_exams student_exams_school_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_exams
    ADD CONSTRAINT student_exams_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE CASCADE;


--
-- Name: student_exams student_exams_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_exams
    ADD CONSTRAINT student_exams_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: student_progress student_progress_school_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_progress
    ADD CONSTRAINT student_progress_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE CASCADE;


--
-- Name: student_progress student_progress_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_progress
    ADD CONSTRAINT student_progress_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: students students_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;


--
-- Name: students students_kutir_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_kutir_id_fkey FOREIGN KEY (kutir_id) REFERENCES public.kutirs(id) ON DELETE SET NULL;


--
-- Name: students students_sub_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_sub_category_id_fkey FOREIGN KEY (sub_category_id) REFERENCES public.sub_categories(id) ON DELETE SET NULL;


--
-- Name: sub_categories sub_categories_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sub_categories
    ADD CONSTRAINT sub_categories_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id);


--
-- Name: user_areas user_areas_area_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_areas
    ADD CONSTRAINT user_areas_area_id_fkey FOREIGN KEY (area_id) REFERENCES public.areas(id) ON DELETE CASCADE;


--
-- Name: user_areas user_areas_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_areas
    ADD CONSTRAINT user_areas_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_clusters user_clusters_cluster_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_clusters
    ADD CONSTRAINT user_clusters_cluster_id_fkey FOREIGN KEY (cluster_id) REFERENCES public.clusters(id) ON DELETE CASCADE;


--
-- Name: user_clusters user_clusters_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_clusters
    ADD CONSTRAINT user_clusters_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_districts user_districts_district_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_districts
    ADD CONSTRAINT user_districts_district_id_fkey FOREIGN KEY (district_id) REFERENCES public.districts(id) ON DELETE CASCADE;


--
-- Name: user_districts user_districts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_districts
    ADD CONSTRAINT user_districts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_kutirs user_kutirs_kutir_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_kutirs
    ADD CONSTRAINT user_kutirs_kutir_id_fkey FOREIGN KEY (kutir_id) REFERENCES public.kutirs(id) ON DELETE CASCADE;


--
-- Name: user_kutirs user_kutirs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_kutirs
    ADD CONSTRAINT user_kutirs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_zones user_zones_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_zones
    ADD CONSTRAINT user_zones_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_zones user_zones_zone_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_zones
    ADD CONSTRAINT user_zones_zone_id_fkey FOREIGN KEY (zone_id) REFERENCES public.zones(id) ON DELETE CASCADE;


--
-- Name: zones zones_zonal_head_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zones
    ADD CONSTRAINT zones_zonal_head_id_fkey FOREIGN KEY (zonal_head_id) REFERENCES public.users(id);


--
-- PostgreSQL database dump complete
--

\unrestrict CuDXdnnMQj5wDerTkDx0JMf54HvWhYJcfNTMiRmml9YlJJd8B9JR0ifDbD93X08

