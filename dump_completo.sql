--
-- PostgreSQL database dump
--

\restrict A0OpV4g2QFWYpcCFE3oJBtgsQZiJMgbsHIIx5oPMSBj061Hyn9SefoJ2bPYFLhm

-- Dumped from database version 17.8 (a48d9ca)
-- Dumped by pg_dump version 17.9

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

--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: bag_listings_gender_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.bag_listings_gender_enum AS ENUM (
    'male',
    'female'
);


--
-- Name: bag_listings_hand_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.bag_listings_hand_enum AS ENUM (
    'left_handed',
    'right_handed'
);


--
-- Name: clubs_category_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.clubs_category_enum AS ENUM (
    'driver',
    'wood',
    'hybrid_rescue',
    'iron',
    'wedge',
    'putter'
);


--
-- Name: clubs_flex_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.clubs_flex_enum AS ENUM (
    'ladies',
    'senior',
    'regular',
    'stiff',
    'x_stiff',
    'xx_stiff'
);


--
-- Name: clubs_shaft_type_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.clubs_shaft_type_enum AS ENUM (
    'steel',
    'graphite'
);


--
-- Name: notifications_type_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.notifications_type_enum AS ENUM (
    'rental_confirmed',
    'rental_cancelled_by_renter',
    'rental_cancelled_by_owner',
    'rental_started',
    'rental_completed'
);


--
-- Name: rentals_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.rentals_status_enum AS ENUM (
    'pending_payment',
    'confirmed',
    'active',
    'completed',
    'cancelled_by_renter',
    'cancelled_by_owner',
    'expired'
);


--
-- Name: users_authprovider_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.users_authprovider_enum AS ENUM (
    'local',
    'google',
    'facebook'
);


--
-- Name: check_rental_overlap(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_rental_overlap() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM rentals
        WHERE listing_id = NEW.listing_id
        AND status IN ('confirmed', 'active', 'pending_payment')
        AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
        AND (
            (NEW.start_date, NEW.end_date) OVERLAPS (start_date, end_date)
        )
    ) THEN
        RAISE EXCEPTION 'Dates are not available for this listing';
    END IF;
    RETURN NEW;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: bag_listings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bag_listings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    price_per_day numeric(10,2) NOT NULL,
    gender public.bag_listings_gender_enum NOT NULL,
    hand public.bag_listings_hand_enum NOT NULL,
    street character varying(255),
    zip_code character varying(20),
    state character varying(100),
    city character varying(100),
    photos text[] DEFAULT '{}'::text[],
    is_active boolean DEFAULT true NOT NULL,
    is_published boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: club_hybrid_details; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.club_hybrid_details (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    club_id uuid NOT NULL,
    hybrid_number character varying(20) NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: club_iron_details; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.club_iron_details (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    club_id uuid NOT NULL,
    iron_number character varying(20) NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: club_putter_details; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.club_putter_details (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    club_id uuid NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    putter_types text[] DEFAULT '{}'::text[] NOT NULL
);


--
-- Name: club_wedge_details; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.club_wedge_details (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    club_id uuid NOT NULL,
    wedge_type character varying(30) NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: club_wood_details; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.club_wood_details (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    club_id uuid NOT NULL,
    wood_type character varying(20) NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: clubs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clubs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    bag_listing_id uuid NOT NULL,
    category public.clubs_category_enum NOT NULL,
    brand character varying(100) NOT NULL,
    model character varying(100) NOT NULL,
    flex public.clubs_flex_enum NOT NULL,
    loft numeric(4,2) NOT NULL,
    shaft_type public.clubs_shaft_type_enum,
    display_order integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: favorites; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.favorites (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    listing_id uuid NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    rental_id uuid,
    type public.notifications_type_enum NOT NULL,
    title character varying(255) NOT NULL,
    message text NOT NULL,
    metadata jsonb,
    is_read boolean DEFAULT false NOT NULL,
    read_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: refresh_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.refresh_tokens (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    token text NOT NULL,
    user_id uuid NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    is_revoked boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: rentals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rentals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    listing_id uuid NOT NULL,
    renter_id uuid NOT NULL,
    owner_id uuid NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    total_days integer NOT NULL,
    price_per_day numeric(10,2) NOT NULL,
    total_amount numeric(10,2) NOT NULL,
    payment_status character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    payment_intent_id character varying(255),
    payment_method character varying(50),
    paid_at timestamp with time zone,
    refund_amount numeric(10,2),
    refunded_at timestamp with time zone,
    status public.rentals_status_enum DEFAULT 'pending_payment'::public.rentals_status_enum NOT NULL,
    cancelled_at timestamp with time zone,
    cancelled_by uuid,
    cancellation_reason text,
    expires_at timestamp with time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    password character varying(255),
    "authProvider" public.users_authprovider_enum DEFAULT 'local'::public.users_authprovider_enum NOT NULL,
    "providerId" character varying(255),
    "isActive" boolean DEFAULT true NOT NULL,
    "emailVerified" boolean DEFAULT false NOT NULL,
    email character varying NOT NULL,
    stripe_account_id character varying(255),
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    first_name character varying(100),
    last_name character varying(100),
    birthday character varying(20),
    phone character varying(30),
    country character varying(100),
    avatar_url character varying(500),
    location character varying(255)
);


--
-- Data for Name: bag_listings; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.bag_listings VALUES ('d570e28c-b7ec-41a0-ae8b-ef0629279adc', '53180dd0-b96e-4d50-baf0-4668a52c6c82', 'King F9 Complete Set', 'Full set in excellent condition', 25.00, 'male', 'left_handed', '56th Street', '90001', 'California', 'Los Angeles', '{}', true, true, '2026-02-05 18:18:15.92239', '2026-02-05 18:18:15.92239');
INSERT INTO public.bag_listings VALUES ('dc472701-43b7-4e8d-94a3-b9a2a34ecbcb', 'd92e6e2b-3b22-44f9-99fc-62697cc7368d', 'King F9 Complete Set', 'Full set in excellent condition', 25.00, 'male', 'left_handed', '56th Street', '90001', 'California', 'Los Angeles', '{}', true, true, '2026-02-06 02:18:53.015374', '2026-02-06 02:18:53.015374');
INSERT INTO public.bag_listings VALUES ('51f04db0-7783-4789-817b-ad8bb8fa61a4', '013f7301-7c17-401b-87b5-97ce09882965', 'King F9 Complete Set', 'Full set in excellent condition', 25.00, 'male', 'left_handed', '56th Street', '90001', 'California', 'Los Angeles', '{}', true, true, '2026-02-06 02:22:59.618866', '2026-02-06 02:22:59.618866');
INSERT INTO public.bag_listings VALUES ('bae7a29b-2022-46fa-b373-1ea3f59f92a6', '013f7301-7c17-401b-87b5-97ce09882965', 'King F9 Complete Set', 'Full set in excellent condition', 25.00, 'male', 'left_handed', '56th Street', '90001', 'California', 'Los Angeles', '{}', true, true, '2026-02-06 02:24:21.584386', '2026-02-06 02:24:21.584386');
INSERT INTO public.bag_listings VALUES ('c470951a-0f70-4c41-9e8f-b203c1f31d38', '013f7301-7c17-401b-87b5-97ce09882965', 'New listing by FE', 'New product created by front end interface', 200.00, 'male', 'left_handed', 'Pacific Blvd 6000', '90255', 'California', 'Huntington Par', '{}', true, true, '2026-03-16 14:25:44.310696', '2026-03-16 14:25:44.310696');
INSERT INTO public.bag_listings VALUES ('6503bc8b-4ee4-4f1f-8a1a-fbf6311dbc38', '013f7301-7c17-401b-87b5-97ce09882965', 'New listing test', 'test new listing', 100.00, 'male', 'left_handed', 'Villegas', '1714', 'Buenos Aires', 'Pontevedra', '{}', true, true, '2026-03-17 13:01:31.912417', '2026-03-17 13:01:31.912417');
INSERT INTO public.bag_listings VALUES ('c66d53c1-5e4e-45db-94eb-059a2552795d', '013f7301-7c17-401b-87b5-97ce09882965', 'New listing with fix continue', 'New listing with fix continue for driver club', 100.00, 'male', 'right_handed', 'Villegas', '1714', 'Buenos Aires', 'Ituzaingo', '{}', true, true, '2026-03-17 16:55:09.193831', '2026-03-17 16:55:09.193831');
INSERT INTO public.bag_listings VALUES ('d059d5dd-a23c-4d8d-8bd0-101399a45e53', '013f7301-7c17-401b-87b5-97ce09882965', 'Edit listing with data data', 'Fixed continued button', 220.00, 'male', 'left_handed', 'Villegas', '1714', 'Buenos Aires', 'Ituzaingo', '{}', false, true, '2026-03-17 18:51:22.178877', '2026-03-18 12:25:09.18993');
INSERT INTO public.bag_listings VALUES ('698e9f7d-34c7-479a-8dbc-8c948ab7720b', '013f7301-7c17-401b-87b5-97ce09882965', 'Fix edit putter club', 'Fix edit listing', 150.00, 'male', 'right_handed', 'Villegas', '1714', 'Buenos Aires', 'Ituzaingo', '{}', true, true, '2026-03-17 18:11:08.279644', '2026-03-18 12:29:35.971249');
INSERT INTO public.bag_listings VALUES ('e34d17ba-2d70-4c4f-bffe-b0dacdc0bfc2', '013f7301-7c17-401b-87b5-97ce09882965', 'New putter form', 'New putter form ', 153.00, 'male', 'left_handed', 'Villegas 1738', '1714', 'Buenos Aires', 'Ituzaingo', '{https://res.cloudinary.com/dlbrumij2/image/upload/v1774546538/bag_rental/sp1c31a9nzooh73rfvff.jpg,https://res.cloudinary.com/dlbrumij2/image/upload/v1774546538/bag_rental/vbgwgwfy7g97vsnokjgt.jpg,https://res.cloudinary.com/dlbrumij2/image/upload/v1774546537/bag_rental/hqfo2puwe0rviyokbzuw.jpg,https://res.cloudinary.com/dlbrumij2/image/upload/v1774546537/bag_rental/puo2on5muljlunp6kh1g.jpg,https://res.cloudinary.com/dlbrumij2/image/upload/v1774546537/bag_rental/bwqctgeeg3cwbgl5l27i.jpg}', true, true, '2026-03-19 13:42:57.108083', '2026-03-26 17:35:40.466242');
INSERT INTO public.bag_listings VALUES ('a25664c9-042b-4275-8a74-cabab85ab833', '013f7301-7c17-401b-87b5-97ce09882965', 'New listing All types', 'New listing product with all types', 300.00, 'male', 'left_handed', 'Pacific Blvd 6000', '90255', 'California', 'Huntington Park', '{https://res.cloudinary.com/dlbrumij2/image/upload/v1774545798/bag_rental/dabrgrblz8k0fv0dmzv7.jpg,https://res.cloudinary.com/dlbrumij2/image/upload/v1774545797/bag_rental/nv3fzyivfknwirxmspbp.jpg,https://res.cloudinary.com/dlbrumij2/image/upload/v1774545797/bag_rental/mpp2zowvl8zbyyt3yije.jpg,https://res.cloudinary.com/dlbrumij2/image/upload/v1774545796/bag_rental/dkwi3c7h9asxc6frulnp.jpg,https://res.cloudinary.com/dlbrumij2/image/upload/v1774546833/bag_rental/c71vjvxsyi3n6kzlnyh4.jpg}', true, true, '2026-03-16 14:40:38.784957', '2026-03-26 17:40:36.028493');
INSERT INTO public.bag_listings VALUES ('81cd49c7-00fa-4f56-8f16-8f06dfb6aa66', '013f7301-7c17-401b-87b5-97ce09882965', 'Edit listing wizard', 'Edit listing wizard with one page', 153.00, 'male', 'left_handed', 'Villegas 2038', '1714', 'Buenos Aires', 'Ituzaingo', '{}', false, true, '2026-03-18 12:03:25.022439', '2026-03-18 17:19:42.337729');


--
-- Data for Name: club_hybrid_details; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.club_hybrid_details VALUES ('dadcdf07-a37c-4f61-a023-90595fcc7b2e', '39c000e6-829d-4c51-9180-034b75f0b67e', '3', 1, '2026-03-18 17:16:22.500206');
INSERT INTO public.club_hybrid_details VALUES ('0eb568e9-3af0-4d97-8c0b-fdd5eecda9f2', '13f465be-a943-4d53-9549-6d63f9fa0d99', '9', 1, '2026-03-26 17:40:40.057723');


--
-- Data for Name: club_iron_details; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.club_iron_details VALUES ('e937b89a-f982-4579-bb70-2be78d43e0bb', '67a7853b-1146-476e-9965-6daa64d1dbd4', '5', 1, '2026-02-05 18:18:18.592812');
INSERT INTO public.club_iron_details VALUES ('54392c32-c855-4761-82f5-35dc4cb7ab60', '2c353706-1cdb-448a-8b3a-ae6009985879', '5', 1, '2026-02-06 02:18:55.307838');
INSERT INTO public.club_iron_details VALUES ('1d9f8158-84b6-4ac9-a381-fecee2692e6e', '014c304f-56f9-4302-9248-9f0f1296842b', '5', 1, '2026-02-06 02:23:02.012713');
INSERT INTO public.club_iron_details VALUES ('5d4279bf-5ce5-4797-961e-20e639217946', 'bb06a647-c2ee-487c-9074-ec0395760119', '5', 1, '2026-02-06 02:24:23.864581');
INSERT INTO public.club_iron_details VALUES ('8dde99c4-551d-4de7-9043-f83b872bccd0', '62a28e8d-f40c-43f0-bfbd-bd284759a1fd', '4', 1, '2026-03-18 17:16:23.524367');
INSERT INTO public.club_iron_details VALUES ('5eb3502d-5a95-4d4d-8d4d-69cde01a1131', 'd0950e59-287d-4d6a-b148-a05b477b7f67', '2', 1, '2026-03-26 17:40:41.672281');


--
-- Data for Name: club_putter_details; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.club_putter_details VALUES ('4f9b67b7-cb59-459a-a35f-617923e1cc0d', 'feeb40ac-34eb-418d-bf85-1134c894466e', '2026-03-26 17:35:42.260361', '{"new center shafted"}');
INSERT INTO public.club_putter_details VALUES ('b89487f3-5d0e-4bbe-b7ee-b776f41d3245', '452cbc49-3629-4f03-9ba4-1d19802189a2', '2026-03-26 17:35:44.094657', '{blade,"New center shafted 2"}');
INSERT INTO public.club_putter_details VALUES ('3cd21c1a-bdd1-4f1f-a852-c8746dfc0352', 'cc9140cc-fcf6-425a-b57d-a6d6f1e81ea4', '2026-03-26 17:35:46.022866', '{blade}');
INSERT INTO public.club_putter_details VALUES ('b7fecd75-9531-4f68-aab5-2d87fed683c5', 'e8906401-af3b-49d3-a110-1ebcf7b19887', '2026-03-26 17:40:44.674261', '{}');


--
-- Data for Name: club_wedge_details; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.club_wedge_details VALUES ('94ce5a55-3c29-4658-8017-5606e5124536', 'e7d7a72c-2f17-4e5d-8c66-2c234647c391', 'gap', 1, '2026-02-05 18:18:19.633322');
INSERT INTO public.club_wedge_details VALUES ('b9bdeb90-7290-46bc-9308-344fe635d3df', '379de6ec-b862-4ff4-b440-315b569c17a5', 'gap', 1, '2026-02-06 02:18:56.220074');
INSERT INTO public.club_wedge_details VALUES ('e78aa2b7-4cda-4fdc-9474-02789b854004', '15d8e887-e27b-49e8-8382-f51048070b23', 'gap', 1, '2026-02-06 02:23:02.966548');
INSERT INTO public.club_wedge_details VALUES ('f368f002-c292-4259-8eee-8b75204dc45b', '150bf68b-c4ef-4547-bc0d-692e91cc7127', 'gap', 1, '2026-02-06 02:24:25.089851');
INSERT INTO public.club_wedge_details VALUES ('81a388e1-672d-4589-9a3b-dd2d50672e59', '2bb857ab-71a4-4c2f-b8ed-556e03bdccb9', 'pitching', 1, '2026-03-18 17:16:24.539309');
INSERT INTO public.club_wedge_details VALUES ('1e5ef215-a50a-401a-aa17-32df1e243171', 'ef11b6df-a885-4824-b8da-9a211a3f3faf', 'Real Wedge', 1, '2026-03-26 17:40:42.858994');


--
-- Data for Name: club_wood_details; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.club_wood_details VALUES ('50964146-0e1c-4e38-ab46-515c1a2580fd', '139994b7-7c1f-4026-a181-994b74403ba5', '3', 1, '2026-02-05 18:18:17.555174');
INSERT INTO public.club_wood_details VALUES ('cc7e68cf-4645-4b6b-af50-40b08b916686', 'afe3bc23-7557-4b0b-ab2c-5b97fc81e27c', '3', 1, '2026-02-06 02:18:54.397291');
INSERT INTO public.club_wood_details VALUES ('678b3a78-97be-4487-a35c-ecd805e21217', '9c9fb1a0-b83e-48c1-b810-d40e8ad2b626', '3', 1, '2026-02-06 02:23:01.05842');
INSERT INTO public.club_wood_details VALUES ('e05ac0bd-1a84-45a2-9ca4-46bfeeee632d', 'c8092920-6580-4a8c-8359-1aef733fa877', '3', 1, '2026-02-06 02:24:22.952649');
INSERT INTO public.club_wood_details VALUES ('8e4d4ba3-0c62-41ee-b7b2-63fb56954a82', '4306e168-45c2-4bd6-9329-361eeacb4f16', '3', 1, '2026-03-17 16:55:11.227698');
INSERT INTO public.club_wood_details VALUES ('8fd9179b-3484-4249-9c8e-54c440ffbe77', '53eed3e4-0d74-4bb3-a64a-a61b4cdcc667', '10', 1, '2026-03-18 17:16:21.466676');
INSERT INTO public.club_wood_details VALUES ('31a47057-4889-4dc1-a1de-648027689d2e', 'd2c9f0c3-4447-4352-8707-c863b9ee7606', '6 wood', 1, '2026-03-26 17:40:38.748995');


--
-- Data for Name: clubs; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.clubs VALUES ('e3d250de-e396-4d7f-a954-13fa0fba72aa', 'd570e28c-b7ec-41a0-ae8b-ef0629279adc', 'driver', 'Cobra', 'King F9', 'x_stiff', 10.50, 'graphite', 0, '2026-02-05 18:18:16.476835', '2026-02-05 18:18:16.476835');
INSERT INTO public.clubs VALUES ('139994b7-7c1f-4026-a181-994b74403ba5', 'd570e28c-b7ec-41a0-ae8b-ef0629279adc', 'wood', 'Cobra', 'King F9', 'x_stiff', 15.00, 'graphite', 1, '2026-02-05 18:18:17.003759', '2026-02-05 18:18:17.003759');
INSERT INTO public.clubs VALUES ('67a7853b-1146-476e-9965-6daa64d1dbd4', 'd570e28c-b7ec-41a0-ae8b-ef0629279adc', 'iron', 'Cobra', 'King F9', 'x_stiff', 28.00, 'steel', 2, '2026-02-05 18:18:18.083542', '2026-02-05 18:18:18.083542');
INSERT INTO public.clubs VALUES ('e7d7a72c-2f17-4e5d-8c66-2c234647c391', 'd570e28c-b7ec-41a0-ae8b-ef0629279adc', 'wedge', 'Cobra', 'King F9', 'x_stiff', 52.00, 'steel', 3, '2026-02-05 18:18:19.116141', '2026-02-05 18:18:19.116141');
INSERT INTO public.clubs VALUES ('0aefc049-5de8-4cd5-933f-abc080e8af4a', 'd570e28c-b7ec-41a0-ae8b-ef0629279adc', 'putter', 'Cobra', 'King F9', 'regular', 3.00, NULL, 4, '2026-02-05 18:18:20.155872', '2026-02-05 18:18:20.155872');
INSERT INTO public.clubs VALUES ('fa23adb0-a378-4fc4-bc47-5bec4487ef44', 'dc472701-43b7-4e8d-94a3-b9a2a34ecbcb', 'driver', 'Cobra', 'King F9', 'x_stiff', 10.50, 'graphite', 0, '2026-02-06 02:18:53.477044', '2026-02-06 02:18:53.477044');
INSERT INTO public.clubs VALUES ('afe3bc23-7557-4b0b-ab2c-5b97fc81e27c', 'dc472701-43b7-4e8d-94a3-b9a2a34ecbcb', 'wood', 'Cobra', 'King F9', 'x_stiff', 15.00, 'graphite', 1, '2026-02-06 02:18:53.936329', '2026-02-06 02:18:53.936329');
INSERT INTO public.clubs VALUES ('2c353706-1cdb-448a-8b3a-ae6009985879', 'dc472701-43b7-4e8d-94a3-b9a2a34ecbcb', 'iron', 'Cobra', 'King F9', 'x_stiff', 28.00, 'steel', 2, '2026-02-06 02:18:54.855977', '2026-02-06 02:18:54.855977');
INSERT INTO public.clubs VALUES ('379de6ec-b862-4ff4-b440-315b569c17a5', 'dc472701-43b7-4e8d-94a3-b9a2a34ecbcb', 'wedge', 'Cobra', 'King F9', 'x_stiff', 52.00, 'steel', 3, '2026-02-06 02:18:55.768032', '2026-02-06 02:18:55.768032');
INSERT INTO public.clubs VALUES ('2b5e691a-dcdf-4fab-8b0d-7f7fe6d95374', 'dc472701-43b7-4e8d-94a3-b9a2a34ecbcb', 'putter', 'Cobra', 'King F9', 'regular', 3.00, NULL, 4, '2026-02-06 02:18:56.680168', '2026-02-06 02:18:56.680168');
INSERT INTO public.clubs VALUES ('cd0b54fd-a51a-4125-a200-a529c62c3031', '51f04db0-7783-4789-817b-ad8bb8fa61a4', 'driver', 'Cobra', 'King F9', 'x_stiff', 10.50, 'graphite', 0, '2026-02-06 02:23:00.1042', '2026-02-06 02:23:00.1042');
INSERT INTO public.clubs VALUES ('9c9fb1a0-b83e-48c1-b810-d40e8ad2b626', '51f04db0-7783-4789-817b-ad8bb8fa61a4', 'wood', 'Cobra', 'King F9', 'x_stiff', 15.00, 'graphite', 1, '2026-02-06 02:23:00.580651', '2026-02-06 02:23:00.580651');
INSERT INTO public.clubs VALUES ('014c304f-56f9-4302-9248-9f0f1296842b', '51f04db0-7783-4789-817b-ad8bb8fa61a4', 'iron', 'Cobra', 'King F9', 'x_stiff', 28.00, 'steel', 2, '2026-02-06 02:23:01.537894', '2026-02-06 02:23:01.537894');
INSERT INTO public.clubs VALUES ('15d8e887-e27b-49e8-8382-f51048070b23', '51f04db0-7783-4789-817b-ad8bb8fa61a4', 'wedge', 'Cobra', 'King F9', 'x_stiff', 52.00, 'steel', 3, '2026-02-06 02:23:02.493323', '2026-02-06 02:23:02.493323');
INSERT INTO public.clubs VALUES ('2a28f197-acf0-4289-83dd-943bf34f52d0', '51f04db0-7783-4789-817b-ad8bb8fa61a4', 'putter', 'Cobra', 'King F9', 'regular', 3.00, NULL, 4, '2026-02-06 02:23:03.446068', '2026-02-06 02:23:03.446068');
INSERT INTO public.clubs VALUES ('04ec7728-3550-431b-92bc-e892f7c0b37d', 'bae7a29b-2022-46fa-b373-1ea3f59f92a6', 'driver', 'Cobra', 'King F9', 'x_stiff', 10.50, 'graphite', 0, '2026-02-06 02:24:22.041448', '2026-02-06 02:24:22.041448');
INSERT INTO public.clubs VALUES ('c8092920-6580-4a8c-8359-1aef733fa877', 'bae7a29b-2022-46fa-b373-1ea3f59f92a6', 'wood', 'Cobra', 'King F9', 'x_stiff', 15.00, 'graphite', 1, '2026-02-06 02:24:22.49987', '2026-02-06 02:24:22.49987');
INSERT INTO public.clubs VALUES ('bb06a647-c2ee-487c-9074-ec0395760119', 'bae7a29b-2022-46fa-b373-1ea3f59f92a6', 'iron', 'Cobra', 'King F9', 'x_stiff', 28.00, 'steel', 2, '2026-02-06 02:24:23.407721', '2026-02-06 02:24:23.407721');
INSERT INTO public.clubs VALUES ('150bf68b-c4ef-4547-bc0d-692e91cc7127', 'bae7a29b-2022-46fa-b373-1ea3f59f92a6', 'wedge', 'Cobra', 'King F9', 'x_stiff', 52.00, 'steel', 3, '2026-02-06 02:24:24.320533', '2026-02-06 02:24:24.320533');
INSERT INTO public.clubs VALUES ('e8a792e5-d182-47d9-9fc4-b5a707c75772', 'bae7a29b-2022-46fa-b373-1ea3f59f92a6', 'putter', 'Cobra', 'King F9', 'regular', 3.00, NULL, 4, '2026-02-06 02:24:25.552291', '2026-02-06 02:24:25.552291');
INSERT INTO public.clubs VALUES ('bb75733d-67e5-4c62-ad4c-ddb0287dcd77', 'c470951a-0f70-4c41-9e8f-b203c1f31d38', 'driver', 'Cobra', 'King F8', 'x_stiff', 9.00, NULL, 0, '2026-03-16 14:25:44.866752', '2026-03-16 14:25:44.866752');
INSERT INTO public.clubs VALUES ('feeb40ac-34eb-418d-bf85-1134c894466e', 'e34d17ba-2d70-4c4f-bffe-b0dacdc0bfc2', 'putter', 'Cobra 2', 'King 2', 'regular', 0.00, NULL, 0, '2026-03-26 17:35:41.373752', '2026-03-26 17:35:41.373752');
INSERT INTO public.clubs VALUES ('452cbc49-3629-4f03-9ba4-1d19802189a2', 'e34d17ba-2d70-4c4f-bffe-b0dacdc0bfc2', 'putter', 'Cobra 3', 'King 3', 'regular', 0.00, NULL, 1, '2026-03-26 17:35:43.177997', '2026-03-26 17:35:43.177997');
INSERT INTO public.clubs VALUES ('cc9140cc-fcf6-425a-b57d-a6d6f1e81ea4', 'e34d17ba-2d70-4c4f-bffe-b0dacdc0bfc2', 'putter', 'Cobra 1', 'King 1', 'regular', 0.00, NULL, 2, '2026-03-26 17:35:45.116299', '2026-03-26 17:35:45.116299');
INSERT INTO public.clubs VALUES ('d499fcb5-7d1d-4918-8fbf-af716ff292b8', '6503bc8b-4ee4-4f1f-8a1a-fbf6311dbc38', 'driver', 'Cobra test', 'King 10', 'x_stiff', 10.00, NULL, 0, '2026-03-17 13:01:32.596426', '2026-03-17 13:01:32.596426');
INSERT INTO public.clubs VALUES ('c20b6fa1-41cd-4bbd-b8dd-b4f43f3c0896', 'c66d53c1-5e4e-45db-94eb-059a2552795d', 'driver', 'Cobra', 'King 9', 'xx_stiff', 10.00, NULL, 0, '2026-03-17 16:55:09.728961', '2026-03-17 16:55:09.728961');
INSERT INTO public.clubs VALUES ('875a2041-c718-400f-b069-427c8835e351', 'c66d53c1-5e4e-45db-94eb-059a2552795d', 'driver', 'Cobra 2', 'King 10', 'xx_stiff', 8.00, NULL, 1, '2026-03-17 16:55:10.228417', '2026-03-17 16:55:10.228417');
INSERT INTO public.clubs VALUES ('4306e168-45c2-4bd6-9329-361eeacb4f16', 'c66d53c1-5e4e-45db-94eb-059a2552795d', 'wood', 'Cobra', 'King 9', 'xx_stiff', 10.00, NULL, 2, '2026-03-17 16:55:10.725132', '2026-03-17 16:55:10.725132');
INSERT INTO public.clubs VALUES ('12185dd8-9957-4ef9-b82b-00fd69b4b775', 'a25664c9-042b-4275-8a74-cabab85ab833', 'driver', 'Cobra', 'King F7', 'xx_stiff', 9.00, NULL, 0, '2026-03-26 17:40:37.130223', '2026-03-26 17:40:37.130223');
INSERT INTO public.clubs VALUES ('d2c9f0c3-4447-4352-8707-c863b9ee7606', 'a25664c9-042b-4275-8a74-cabab85ab833', 'wood', 'Cobra', 'King F7', 'xx_stiff', 9.00, NULL, 1, '2026-03-26 17:40:38.204721', '2026-03-26 17:40:38.204721');
INSERT INTO public.clubs VALUES ('13f465be-a943-4d53-9549-6d63f9fa0d99', 'a25664c9-042b-4275-8a74-cabab85ab833', 'hybrid_rescue', 'Cobra', 'F7', 'xx_stiff', 9.00, 'steel', 2, '2026-03-26 17:40:39.4247', '2026-03-26 17:40:39.4247');
INSERT INTO public.clubs VALUES ('d0950e59-287d-4d6a-b148-a05b477b7f67', 'a25664c9-042b-4275-8a74-cabab85ab833', 'iron', 'Cobra', 'King F7', 'xx_stiff', 9.00, 'steel', 3, '2026-03-26 17:40:40.732379', '2026-03-26 17:40:40.732379');
INSERT INTO public.clubs VALUES ('ef11b6df-a885-4824-b8da-9a211a3f3faf', 'a25664c9-042b-4275-8a74-cabab85ab833', 'wedge', 'Cobra', 'King F7', 'xx_stiff', 9.00, 'steel', 4, '2026-03-26 17:40:42.249973', '2026-03-26 17:40:42.249973');
INSERT INTO public.clubs VALUES ('e8906401-af3b-49d3-a110-1ebcf7b19887', 'a25664c9-042b-4275-8a74-cabab85ab833', 'putter', 'Cobra', 'King F7', 'regular', 0.00, NULL, 5, '2026-03-26 17:40:43.833042', '2026-03-26 17:40:43.833042');
INSERT INTO public.clubs VALUES ('160570c9-0753-4d2d-98ec-1d5c059c66b3', 'd059d5dd-a23c-4d8d-8bd0-101399a45e53', 'driver', 'Cobra 12', 'King 12', 'regular', 12.00, NULL, 0, '2026-03-18 12:25:09.875616', '2026-03-18 12:25:09.875616');
INSERT INTO public.clubs VALUES ('5b76fe69-386c-4cc4-b4cb-08cf277d2179', '698e9f7d-34c7-479a-8dbc-8c948ab7720b', 'driver', 'Cobra 22', 'King 22', 'x_stiff', 22.00, NULL, 0, '2026-03-18 12:29:36.629634', '2026-03-18 12:29:36.629634');
INSERT INTO public.clubs VALUES ('b2056bba-b1ca-41b8-9b1d-4a1266193728', '698e9f7d-34c7-479a-8dbc-8c948ab7720b', 'driver', 'Cobra 12', 'King 12', 'xx_stiff', 12.00, NULL, 1, '2026-03-18 12:29:37.129682', '2026-03-18 12:29:37.129682');
INSERT INTO public.clubs VALUES ('013409dd-3b2e-4033-a829-74e4237b909d', '698e9f7d-34c7-479a-8dbc-8c948ab7720b', 'putter', 'Cobra 3', 'King 3', 'xx_stiff', 3.00, NULL, 2, '2026-03-18 12:29:37.62873', '2026-03-18 12:29:37.62873');
INSERT INTO public.clubs VALUES ('e1ab913a-426e-4214-887a-a7369a60da35', '698e9f7d-34c7-479a-8dbc-8c948ab7720b', 'putter', 'Cobra 4', 'King 4', 'xx_stiff', 4.00, NULL, 3, '2026-03-18 12:29:38.632665', '2026-03-18 12:29:38.632665');
INSERT INTO public.clubs VALUES ('eb472638-dd24-4400-9fa6-b3c87047fae9', '81cd49c7-00fa-4f56-8f16-8f06dfb6aa66', 'driver', 'Cobra 1', 'King 1', 'regular', 1.00, NULL, 0, '2026-03-18 17:16:19.921148', '2026-03-18 17:16:19.921148');
INSERT INTO public.clubs VALUES ('ab683a4b-4f19-4146-b4ec-088d91d14237', '81cd49c7-00fa-4f56-8f16-8f06dfb6aa66', 'driver', 'Cobra 12', 'King 12', 'regular', 12.00, NULL, 1, '2026-03-18 17:16:20.441149', '2026-03-18 17:16:20.441149');
INSERT INTO public.clubs VALUES ('53eed3e4-0d74-4bb3-a64a-a61b4cdcc667', '81cd49c7-00fa-4f56-8f16-8f06dfb6aa66', 'wood', 'Cobra 3', 'King 3', 'stiff', 2.00, NULL, 2, '2026-03-18 17:16:20.945981', '2026-03-18 17:16:20.945981');
INSERT INTO public.clubs VALUES ('39c000e6-829d-4c51-9180-034b75f0b67e', '81cd49c7-00fa-4f56-8f16-8f06dfb6aa66', 'hybrid_rescue', 'Cobra 4', 'King 4', 'x_stiff', 4.00, 'steel', 3, '2026-03-18 17:16:21.983271', '2026-03-18 17:16:21.983271');
INSERT INTO public.clubs VALUES ('62a28e8d-f40c-43f0-bfbd-bd284759a1fd', '81cd49c7-00fa-4f56-8f16-8f06dfb6aa66', 'iron', 'Cobra 5', 'King 5', 'x_stiff', 5.00, 'graphite', 4, '2026-03-18 17:16:23.012985', '2026-03-18 17:16:23.012985');
INSERT INTO public.clubs VALUES ('2bb857ab-71a4-4c2f-b8ed-556e03bdccb9', '81cd49c7-00fa-4f56-8f16-8f06dfb6aa66', 'wedge', 'Cobra 6', 'King 6', 'xx_stiff', 6.00, 'steel', 5, '2026-03-18 17:16:24.034535', '2026-03-18 17:16:24.034535');
INSERT INTO public.clubs VALUES ('e009c0f8-0386-4725-ab83-673790448fd3', '81cd49c7-00fa-4f56-8f16-8f06dfb6aa66', 'putter', 'Cobra 7', 'King 7', 'xx_stiff', 7.00, NULL, 6, '2026-03-18 17:16:25.040151', '2026-03-18 17:16:25.040151');
INSERT INTO public.clubs VALUES ('c3847b51-d6f5-4e9b-8ab8-c4d2c18c96a0', '81cd49c7-00fa-4f56-8f16-8f06dfb6aa66', 'putter', 'Cobra 8', 'King 8', 'xx_stiff', 8.00, NULL, 7, '2026-03-18 17:16:26.052421', '2026-03-18 17:16:26.052421');


--
-- Data for Name: favorites; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.favorites VALUES ('3feffbf2-9ea6-4e47-b694-f07c0a76192d', '53180dd0-b96e-4d50-baf0-4668a52c6c82', 'bae7a29b-2022-46fa-b373-1ea3f59f92a6', '2026-02-10 20:29:40.812544');
INSERT INTO public.favorites VALUES ('6056c060-da0a-4d66-8156-621916d8bcc7', '013f7301-7c17-401b-87b5-97ce09882965', '698e9f7d-34c7-479a-8dbc-8c948ab7720b', '2026-03-18 17:20:31.03112');
INSERT INTO public.favorites VALUES ('d17b846a-473b-4a4a-a06e-5bb19f15080f', '013f7301-7c17-401b-87b5-97ce09882965', '6503bc8b-4ee4-4f1f-8a1a-fbf6311dbc38', '2026-03-18 17:20:43.743143');
INSERT INTO public.favorites VALUES ('092c780c-f9c6-41c6-ab53-3f6c61c49f23', 'd92e6e2b-3b22-44f9-99fc-62697cc7368d', '698e9f7d-34c7-479a-8dbc-8c948ab7720b', '2026-03-25 14:38:58.824169');


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.notifications VALUES ('cf2435fe-ff67-449a-a066-916cd8b22401', '013f7301-7c17-401b-87b5-97ce09882965', '386f904c-a8e1-48fa-bd72-f5de2ddd074a', 'rental_confirmed', 'Your bag has been rented!', 'Your bag was rented from 2026-04-29 to 2026-04-30. Payment was successfully processed.', '{"endDate": "2026-04-30", "rentalId": "386f904c-a8e1-48fa-bd72-f5de2ddd074a", "listingId": "e34d17ba-2d70-4c4f-bffe-b0dacdc0bfc2", "startDate": "2026-04-29", "totalDays": 1, "totalAmount": "153.00"}', true, '2026-04-22 12:03:57.755+00', '2026-04-20 20:04:03.004317+00');
INSERT INTO public.notifications VALUES ('79a9b883-a8dc-4aa7-9835-ac4683a17808', '013f7301-7c17-401b-87b5-97ce09882965', '4af87c2d-2a2f-449f-a7f0-5d116eb72070', 'rental_confirmed', '🎉 ¡Tu bolsa fue rentada!', 'Tu bolsa fue rentada del 2026-04-23 al 2026-04-24. El pago fue procesado exitosamente.', '{"endDate": "2026-04-24", "rentalId": "4af87c2d-2a2f-449f-a7f0-5d116eb72070", "listingId": "698e9f7d-34c7-479a-8dbc-8c948ab7720b", "startDate": "2026-04-23", "totalDays": 1, "totalAmount": "150.00"}', true, '2026-04-22 12:46:26.258+00', '2026-04-20 19:49:51.018788+00');
INSERT INTO public.notifications VALUES ('54750eb4-c392-4460-b2bd-354b9d190e00', '013f7301-7c17-401b-87b5-97ce09882965', '20d0a309-3040-4b9d-ba08-f969a2ccf429', 'rental_confirmed', 'Your bag has been rented!', 'Your bag was rented from 2026-04-24 to 2026-04-25. Payment was successfully processed.', '{"endDate": "2026-04-25", "rentalId": "20d0a309-3040-4b9d-ba08-f969a2ccf429", "listingId": "e34d17ba-2d70-4c4f-bffe-b0dacdc0bfc2", "startDate": "2026-04-24", "totalDays": 1, "totalAmount": "153.00"}', false, NULL, '2026-04-22 13:28:13.259414+00');


--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.refresh_tokens VALUES ('d49371f4-04be-48eb-8942-eb592d013914', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkOTJlNmUyYi0zYjIyLTQ0ZjktOTlmYy02MjY5N2NjNzM2OGQiLCJ0eXBlIjoicmVmcmVzaCIsImlhdCI6MTc3NDAxMjEzOCwiZXhwIjoxNzc2NjA0MTM4fQ.kfxfnXrXCBWW-nN4gwChSTGpoxTcgRXcv6RJuj3fs7c', 'd92e6e2b-3b22-44f9-99fc-62697cc7368d', '2026-04-19 13:08:58.067+00', true, '2026-03-20 13:08:58.156692');
INSERT INTO public.refresh_tokens VALUES ('efd6fc40-e791-45dc-92e7-6000fa46548a', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkOTJlNmUyYi0zYjIyLTQ0ZjktOTlmYy02MjY5N2NjNzM2OGQiLCJ0eXBlIjoicmVmcmVzaCIsImlhdCI6MTc3NDQzOTAwOCwiZXhwIjoxNzc3MDMxMDA4fQ.4jCdV3J6GjR6cm--fwYyPU2G99pXsHgh7o6TqqGUX3s', 'd92e6e2b-3b22-44f9-99fc-62697cc7368d', '2026-04-24 11:43:28.397+00', false, '2026-03-25 11:43:30.528194');
INSERT INTO public.refresh_tokens VALUES ('6cbbdb61-5696-4bac-ad4f-18f46f75b457', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwMTNmNzMwMS03YzE3LTQwMWItODdiNS05N2NlMDk4ODI5NjUiLCJ0eXBlIjoicmVmcmVzaCIsImlhdCI6MTc3NDU0NTQ2MiwiZXhwIjoxNzc3MTM3NDYyfQ.oOwkow2z9Mb0Nz4pUmQmw4lr4vIta9mTyxG5uW-ka_o', '013f7301-7c17-401b-87b5-97ce09882965', '2026-04-25 17:17:42.406+00', false, '2026-03-26 17:17:42.59358');
INSERT INTO public.refresh_tokens VALUES ('98c64985-5f9b-4ee7-9458-21e739a3a2e9', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwMTNmNzMwMS03YzE3LTQwMWItODdiNS05N2NlMDk4ODI5NjUiLCJ0eXBlIjoicmVmcmVzaCIsImlhdCI6MTc3NDg3Njk5OCwiZXhwIjoxNzc3NDY4OTk4fQ.0MT1-KjQCBoPews2maIHausO4Bb5E6EUwFLZrQS0o5Y', '013f7301-7c17-401b-87b5-97ce09882965', '2026-04-29 13:23:18.064+00', false, '2026-03-30 13:23:18.255504');
INSERT INTO public.refresh_tokens VALUES ('aa72c90d-4d7c-474c-aadb-d44d52b2d4d7', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkOTJlNmUyYi0zYjIyLTQ0ZjktOTlmYy02MjY5N2NjNzM2OGQiLCJ0eXBlIjoicmVmcmVzaCIsImlhdCI6MTc3NTc1MzIyMSwiZXhwIjoxNzc4MzQ1MjIxfQ.upOAiguS-MxWFUZ1zZN_DCeQSuaRpY_wKioVP94o6kw', 'd92e6e2b-3b22-44f9-99fc-62697cc7368d', '2026-05-09 16:47:01+00', false, '2026-04-09 16:47:01.10279');
INSERT INTO public.refresh_tokens VALUES ('c5e3228e-040d-448c-b515-85903b1e8699', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhOGMzNTZlOC1lMTYxLTRiNzItYTgxMi02NGQ5OTg5MzRlNDAiLCJ0eXBlIjoicmVmcmVzaCIsImlhdCI6MTc3NTc1MzQyMCwiZXhwIjoxNzc4MzQ1NDIwfQ.5ueQg4xdc8yVLxFeUmqDlknrT8CHMGwpBvJDiSy27oY', 'a8c356e8-e161-4b72-a812-64d998934e40', '2026-05-09 16:50:20.583+00', false, '2026-04-09 16:50:20.682372');
INSERT INTO public.refresh_tokens VALUES ('9e1e592d-a7bc-40cf-838c-4f50992c7d08', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI3ZGI0MWU4Ny0zY2M3LTQwMWMtYWY3MC1kZWU1ZjIxNDk5MjEiLCJ0eXBlIjoicmVmcmVzaCIsImlhdCI6MTc3NTc1MzQ1MywiZXhwIjoxNzc4MzQ1NDUzfQ.hew6KcGIb0sT_q-ZSrV3MKEpQZCCp_u3djEUuK2bn5s', '7db41e87-3cc7-401c-af70-dee5f2149921', '2026-05-09 16:50:53.286+00', false, '2026-04-09 16:50:53.383567');
INSERT INTO public.refresh_tokens VALUES ('6c8ec958-dd17-4191-a1c1-b0518e9e2ae9', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkOTJlNmUyYi0zYjIyLTQ0ZjktOTlmYy02MjY5N2NjNzM2OGQiLCJ0eXBlIjoicmVmcmVzaCIsImlhdCI6MTc3NTc1MzQ4MywiZXhwIjoxNzc4MzQ1NDgzfQ.Lqx7fMmYY6NfPQCL7n-OpgEispXmATfE9fOfTghv9-k', 'd92e6e2b-3b22-44f9-99fc-62697cc7368d', '2026-05-09 16:51:23.622+00', true, '2026-04-09 16:51:23.724639');
INSERT INTO public.refresh_tokens VALUES ('815f0fa1-6d42-4829-b003-d497d61a6d8b', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkOTJlNmUyYi0zYjIyLTQ0ZjktOTlmYy02MjY5N2NjNzM2OGQiLCJ0eXBlIjoicmVmcmVzaCIsImlhdCI6MTc3NjcwODg1MSwiZXhwIjoxNzc5MzAwODUxfQ.O3lvg0MiHPqF5LWa0zGbJaDgQh7GaG7wNKGPb-ss3fI', 'd92e6e2b-3b22-44f9-99fc-62697cc7368d', '2026-05-20 18:14:11.436+00', false, '2026-04-20 18:14:11.522893');
INSERT INTO public.refresh_tokens VALUES ('bc50d167-8da7-4d21-92ce-6a8f284c6f27', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwMTNmNzMwMS03YzE3LTQwMWItODdiNS05N2NlMDk4ODI5NjUiLCJ0eXBlIjoicmVmcmVzaCIsImlhdCI6MTc3NjcxMzQxOCwiZXhwIjoxNzc5MzA1NDE4fQ.otrafaHYO6B1MLQZmiuemSO6i1_9I71A1ZG2SgxtrMA', '013f7301-7c17-401b-87b5-97ce09882965', '2026-05-20 19:30:18.539+00', false, '2026-04-20 19:30:18.686737');
INSERT INTO public.refresh_tokens VALUES ('9a8b483b-d3f4-4062-acf1-9f2cf940c5cd', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwMTNmNzMwMS03YzE3LTQwMWItODdiNS05N2NlMDk4ODI5NjUiLCJ0eXBlIjoicmVmcmVzaCIsImlhdCI6MTc3Njc4MzIzNCwiZXhwIjoxNzc5Mzc1MjM0fQ.ts1WpH0pCyneH-PgWiedqtFVV13ilzyaytYtn1IGdrI', '013f7301-7c17-401b-87b5-97ce09882965', '2026-05-21 14:53:54.646+00', false, '2026-04-21 14:53:54.682602');
INSERT INTO public.refresh_tokens VALUES ('abf06f49-1af6-4dbf-a998-d1c2375289e3', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwMTNmNzMwMS03YzE3LTQwMWItODdiNS05N2NlMDk4ODI5NjUiLCJ0eXBlIjoicmVmcmVzaCIsImlhdCI6MTc3Mzg2MjMyNCwiZXhwIjoxNzc2NDU0MzI0fQ.I16ZqRqQyQBopDqlPnSg7onLrrkGXPxakgxhdXTdTcg', '013f7301-7c17-401b-87b5-97ce09882965', '2026-04-17 19:32:04.915+00', false, '2026-03-18 19:32:05.194709');
INSERT INTO public.refresh_tokens VALUES ('1bae3872-6e3b-425a-96bb-2704a9f4b44b', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwMTNmNzMwMS03YzE3LTQwMWItODdiNS05N2NlMDk4ODI5NjUiLCJ0eXBlIjoicmVmcmVzaCIsImlhdCI6MTc3NTc1MzA5NiwiZXhwIjoxNzc4MzQ1MDk2fQ.Gvztz5n9PSgZEyR-75bP3KGY5aTKbiBy0auRDPLu6h4', '013f7301-7c17-401b-87b5-97ce09882965', '2026-05-09 16:44:56.915+00', false, '2026-04-09 16:44:57.02288');
INSERT INTO public.refresh_tokens VALUES ('c86ab049-b032-4bc1-aeee-ddfeed25d69a', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkOTJlNmUyYi0zYjIyLTQ0ZjktOTlmYy02MjY5N2NjNzM2OGQiLCJ0eXBlIjoicmVmcmVzaCIsImlhdCI6MTc3NjcwODg1MSwiZXhwIjoxNzc5MzAwODUxfQ.O3lvg0MiHPqF5LWa0zGbJaDgQh7GaG7wNKGPb-ss3fI', 'd92e6e2b-3b22-44f9-99fc-62697cc7368d', '2026-05-20 18:14:11.429+00', false, '2026-04-20 18:14:11.515936');
INSERT INTO public.refresh_tokens VALUES ('ec791e47-4bbb-47ba-8a1c-63ca3e3ba3de', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkOTJlNmUyYi0zYjIyLTQ0ZjktOTlmYy02MjY5N2NjNzM2OGQiLCJ0eXBlIjoicmVmcmVzaCIsImlhdCI6MTc3NjcwOTg4OCwiZXhwIjoxNzc5MzAxODg4fQ.wG-r7Aa3iwtK-oENEb0HLGL739w8YCAf5Sjn9btPWSs', 'd92e6e2b-3b22-44f9-99fc-62697cc7368d', '2026-05-20 18:31:28.511+00', false, '2026-04-20 18:31:28.598465');
INSERT INTO public.refresh_tokens VALUES ('495418eb-80b4-41ac-85eb-2ea9716933d8', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkOTJlNmUyYi0zYjIyLTQ0ZjktOTlmYy02MjY5N2NjNzM2OGQiLCJ0eXBlIjoicmVmcmVzaCIsImlhdCI6MTc3NjcwOTkzMCwiZXhwIjoxNzc5MzAxOTMwfQ.AHrrbWj0ThRvJshb16Z5QmPeHRCiLMHv4xY4Nypsuew', 'd92e6e2b-3b22-44f9-99fc-62697cc7368d', '2026-05-20 18:32:10.847+00', false, '2026-04-20 18:32:10.935264');
INSERT INTO public.refresh_tokens VALUES ('bf9fa8cc-e627-4d66-b71b-651c86976ebf', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwMTNmNzMwMS03YzE3LTQwMWItODdiNS05N2NlMDk4ODI5NjUiLCJ0eXBlIjoicmVmcmVzaCIsImlhdCI6MTc3NjcxMzMzNiwiZXhwIjoxNzc5MzA1MzM2fQ.SY93DexY3y6n0PWjIJZoBUap9nRRcD_Qaaq5UwOzvNc', '013f7301-7c17-401b-87b5-97ce09882965', '2026-05-20 19:28:56.32+00', false, '2026-04-20 19:28:56.471661');
INSERT INTO public.refresh_tokens VALUES ('a24e3507-ad62-4bd7-a11b-09234e372d3b', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkOTJlNmUyYi0zYjIyLTQ0ZjktOTlmYy02MjY5N2NjNzM2OGQiLCJ0eXBlIjoicmVmcmVzaCIsImlhdCI6MTc3NjcxMzQ0NywiZXhwIjoxNzc5MzA1NDQ3fQ.E8h8WGlYY7-uBj1n0AlOD1Pqqtw1j9PBYBXcDAVTxcc', 'd92e6e2b-3b22-44f9-99fc-62697cc7368d', '2026-05-20 19:30:47.723+00', false, '2026-04-20 19:30:47.870817');
INSERT INTO public.refresh_tokens VALUES ('9ab1f73a-f150-41cb-b7e4-cba755e3109e', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkOTJlNmUyYi0zYjIyLTQ0ZjktOTlmYy02MjY5N2NjNzM2OGQiLCJ0eXBlIjoicmVmcmVzaCIsImlhdCI6MTc3Njc3Mzk1MSwiZXhwIjoxNzc5MzY1OTUxfQ.OC6LtqU4hSZLQGF8wy2yfWgiZc3mBHKIZmfiI0tG6OM', 'd92e6e2b-3b22-44f9-99fc-62697cc7368d', '2026-05-21 12:19:11.27+00', false, '2026-04-21 12:19:11.306806');
INSERT INTO public.refresh_tokens VALUES ('23a4c37c-5327-4954-ae71-e270b833c5fb', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwMTNmNzMwMS03YzE3LTQwMWItODdiNS05N2NlMDk4ODI5NjUiLCJ0eXBlIjoicmVmcmVzaCIsImlhdCI6MTc3Njc3NjA1NiwiZXhwIjoxNzc5MzY4MDU2fQ.pNebC1mUFZOJQ7Fx7xwirfO8x2INLiIU_80wH-sJKLY', '013f7301-7c17-401b-87b5-97ce09882965', '2026-05-21 12:54:16.667+00', false, '2026-04-21 12:54:16.702381');
INSERT INTO public.refresh_tokens VALUES ('6ed0fa4b-f828-469d-bbfd-92dd8866cc5c', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkOTJlNmUyYi0zYjIyLTQ0ZjktOTlmYy02MjY5N2NjNzM2OGQiLCJ0eXBlIjoicmVmcmVzaCIsImlhdCI6MTc3Njc3ODY5OSwiZXhwIjoxNzc5MzcwNjk5fQ.FtHnWOkpsoyExVRDTEHZuRJspC27EJArjqV4FI0Ii-4', 'd92e6e2b-3b22-44f9-99fc-62697cc7368d', '2026-05-21 13:38:19.348+00', false, '2026-04-21 13:38:19.383014');
INSERT INTO public.refresh_tokens VALUES ('7fc6b658-a4fd-446a-b407-79e8d98f371d', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwMTNmNzMwMS03YzE3LTQwMWItODdiNS05N2NlMDk4ODI5NjUiLCJ0eXBlIjoicmVmcmVzaCIsImlhdCI6MTc3Njc5NTM1OCwiZXhwIjoxNzc5Mzg3MzU4fQ.ruaxjxKsX5vVAqdbrUdEuASzf03VRfXLD5r4wprki0s', '013f7301-7c17-401b-87b5-97ce09882965', '2026-05-21 18:15:58.282+00', false, '2026-04-21 18:15:58.320028');
INSERT INTO public.refresh_tokens VALUES ('c9bdb114-58e2-4bb7-938a-0cb93abfabd6', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkOTJlNmUyYi0zYjIyLTQ0ZjktOTlmYy02MjY5N2NjNzM2OGQiLCJ0eXBlIjoicmVmcmVzaCIsImlhdCI6MTc3Njc5NTQwMiwiZXhwIjoxNzc5Mzg3NDAyfQ.Uq0KV8OXpyE2uD3yqUYp2pyqvfm7z7zZi74FTDlaHh8', 'd92e6e2b-3b22-44f9-99fc-62697cc7368d', '2026-05-21 18:16:42.487+00', false, '2026-04-21 18:16:42.521696');
INSERT INTO public.refresh_tokens VALUES ('81aeed7a-3204-42af-b703-69d82e716df6', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwMTNmNzMwMS03YzE3LTQwMWItODdiNS05N2NlMDk4ODI5NjUiLCJ0eXBlIjoicmVmcmVzaCIsImlhdCI6MTc3Njc5Nzg5MywiZXhwIjoxNzc5Mzg5ODkzfQ.b63Kwp8tadtus5mAkfrkDNBPUcga9vVhAKa7l40EULk', '013f7301-7c17-401b-87b5-97ce09882965', '2026-05-21 18:58:13.323+00', false, '2026-04-21 18:58:13.356636');
INSERT INTO public.refresh_tokens VALUES ('672a2161-fc90-47b9-bf5a-c6632be4b840', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkOTJlNmUyYi0zYjIyLTQ0ZjktOTlmYy02MjY5N2NjNzM2OGQiLCJ0eXBlIjoicmVmcmVzaCIsImlhdCI6MTc3NjgwMzExOSwiZXhwIjoxNzc5Mzk1MTE5fQ.3wPt2Hkyax0_vfzeZirUPOXY41BfQCaeCIARmxsT-wU', 'd92e6e2b-3b22-44f9-99fc-62697cc7368d', '2026-05-21 20:25:19.477+00', false, '2026-04-21 20:25:19.513402');
INSERT INTO public.refresh_tokens VALUES ('9b46dfa5-fa70-4927-9f1b-ea7ae3ff9534', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkOTJlNmUyYi0zYjIyLTQ0ZjktOTlmYy02MjY5N2NjNzM2OGQiLCJ0eXBlIjoicmVmcmVzaCIsImlhdCI6MTc3NjgwMzE0OCwiZXhwIjoxNzc5Mzk1MTQ4fQ.UqchCFSs3E36wRtHYNvQ80TJypNNhFsJP__SC_6luMg', 'd92e6e2b-3b22-44f9-99fc-62697cc7368d', '2026-05-21 20:25:48.691+00', false, '2026-04-21 20:25:48.807796');
INSERT INTO public.refresh_tokens VALUES ('57de6356-c90a-455d-8b08-feb20d43320c', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwMTNmNzMwMS03YzE3LTQwMWItODdiNS05N2NlMDk4ODI5NjUiLCJ0eXBlIjoicmVmcmVzaCIsImlhdCI6MTc3NjgwMzc4NiwiZXhwIjoxNzc5Mzk1Nzg2fQ.l81uZbLN9oMywjmmiUSEMKYG7mTVga2PPwErmtavIpI', '013f7301-7c17-401b-87b5-97ce09882965', '2026-05-21 20:36:26.117+00', false, '2026-04-21 20:36:26.148933');
INSERT INTO public.refresh_tokens VALUES ('e27e3ff8-3e39-4c53-a713-548f0dcf5041', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkOTJlNmUyYi0zYjIyLTQ0ZjktOTlmYy02MjY5N2NjNzM2OGQiLCJ0eXBlIjoicmVmcmVzaCIsImlhdCI6MTc3Njg1ODM0NywiZXhwIjoxNzc5NDUwMzQ3fQ.52fWs7Gq_d5oL7Ot8urCCr8jBkgMkWZgZWl1xHZu_PE', 'd92e6e2b-3b22-44f9-99fc-62697cc7368d', '2026-05-22 11:45:47.771+00', false, '2026-04-22 11:45:47.892001');
INSERT INTO public.refresh_tokens VALUES ('1528e5f2-12b1-4562-bf14-f781079b6bed', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwMTNmNzMwMS03YzE3LTQwMWItODdiNS05N2NlMDk4ODI5NjUiLCJ0eXBlIjoicmVmcmVzaCIsImlhdCI6MTc3Njg1OTQyNiwiZXhwIjoxNzc5NDUxNDI2fQ.tANmdoh-i-VYYbz1L64NGnuk0Q7pe-gJmQkZnHXDJlI', '013f7301-7c17-401b-87b5-97ce09882965', '2026-05-22 12:03:46.868+00', false, '2026-04-22 12:03:46.901277');
INSERT INTO public.refresh_tokens VALUES ('a2bc2cb6-502c-405c-9faa-e36e12f77aca', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkOTJlNmUyYi0zYjIyLTQ0ZjktOTlmYy02MjY5N2NjNzM2OGQiLCJ0eXBlIjoicmVmcmVzaCIsImlhdCI6MTc3Njg2NDQ0OCwiZXhwIjoxNzc5NDU2NDQ4fQ.i_KF7ro2Go_RvfMI_c3tzxccGtUymSXSeX2au1CxfLU', 'd92e6e2b-3b22-44f9-99fc-62697cc7368d', '2026-05-22 13:27:28.31+00', false, '2026-04-22 13:27:28.343776');
INSERT INTO public.refresh_tokens VALUES ('f536c504-7d5d-4ec7-b2b5-1c36a41f2617', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwMTNmNzMwMS03YzE3LTQwMWItODdiNS05N2NlMDk4ODI5NjUiLCJ0eXBlIjoicmVmcmVzaCIsImlhdCI6MTc3Njg2NDY2NCwiZXhwIjoxNzc5NDU2NjY0fQ.A7BERlLOqByUXGyhC3qR6KG_hd_fo5GWE8RKGzjyoYM', '013f7301-7c17-401b-87b5-97ce09882965', '2026-05-22 13:31:04.22+00', false, '2026-04-22 13:31:04.252528');
INSERT INTO public.refresh_tokens VALUES ('894cf052-f08d-4205-8611-73bc1c476eb7', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwMTNmNzMwMS03YzE3LTQwMWItODdiNS05N2NlMDk4ODI5NjUiLCJ0eXBlIjoicmVmcmVzaCIsImlhdCI6MTc3NDQ1ODUzNiwiZXhwIjoxNzc3MDUwNTM2fQ.It3tIbWrJSRq0tFE5X1vb0J4d83Dr8t4VueUzfSy9p8', '013f7301-7c17-401b-87b5-97ce09882965', '2026-04-24 17:08:56.206+00', true, '2026-03-25 17:08:56.304567');
INSERT INTO public.refresh_tokens VALUES ('cace3516-6b6b-44b3-a9c1-d5c09cbe48bf', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwMTNmNzMwMS03YzE3LTQwMWItODdiNS05N2NlMDk4ODI5NjUiLCJ0eXBlIjoicmVmcmVzaCIsImlhdCI6MTc3NDU0NTQ2MiwiZXhwIjoxNzc3MTM3NDYyfQ.oOwkow2z9Mb0Nz4pUmQmw4lr4vIta9mTyxG5uW-ka_o', '013f7301-7c17-401b-87b5-97ce09882965', '2026-04-25 17:17:42.41+00', false, '2026-03-26 17:17:42.600757');
INSERT INTO public.refresh_tokens VALUES ('72ad3792-c4a9-4756-aebb-50d16221520b', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI3ZGI0MWU4Ny0zY2M3LTQwMWMtYWY3MC1kZWU1ZjIxNDk5MjEiLCJ0eXBlIjoicmVmcmVzaCIsImlhdCI6MTc3MzkyMDMwMCwiZXhwIjoxNzc2NTEyMzAwfQ.d9nGAPx4lUyiuWJ523YqmIbAjXJYqBC-ptbFzsSGHEA', '7db41e87-3cc7-401c-af70-dee5f2149921', '2026-04-18 11:38:20.147+00', false, '2026-03-19 11:38:22.332103');
INSERT INTO public.refresh_tokens VALUES ('9a40b103-2512-45d3-b10d-939b1a89a768', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwMTNmNzMwMS03YzE3LTQwMWItODdiNS05N2NlMDk4ODI5NjUiLCJ0eXBlIjoicmVmcmVzaCIsImlhdCI6MTc3MzkyMDYxNSwiZXhwIjoxNzc2NTEyNjE1fQ.MZfN_sSCW99PCckVUBp5SL8x5EK_mU6Grxy3_JXo0UE', '013f7301-7c17-401b-87b5-97ce09882965', '2026-04-18 11:43:35.236+00', true, '2026-03-19 11:43:37.441427');
INSERT INTO public.refresh_tokens VALUES ('51927f97-8f86-4990-89de-44237dbccf9e', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwMTNmNzMwMS03YzE3LTQwMWItODdiNS05N2NlMDk4ODI5NjUiLCJ0eXBlIjoicmVmcmVzaCIsImlhdCI6MTc3MzkyMjUwMywiZXhwIjoxNzc2NTE0NTAzfQ.QXuX9syTtaZUZDXQ-Wq6-NChLlOuJkT8R32RDQdz2zg', '013f7301-7c17-401b-87b5-97ce09882965', '2026-04-18 12:15:03.87+00', false, '2026-03-19 12:15:03.994065');
INSERT INTO public.refresh_tokens VALUES ('02a602cc-17a2-4f48-bf7d-46d85cd01830', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwMTNmNzMwMS03YzE3LTQwMWItODdiNS05N2NlMDk4ODI5NjUiLCJ0eXBlIjoicmVmcmVzaCIsImlhdCI6MTc3MzkyNDU0MSwiZXhwIjoxNzc2NTE2NTQxfQ.K0zsxQjKEEfWZZPLPHF-uq4isCpFUBsGs9qMyFKN0OU', '013f7301-7c17-401b-87b5-97ce09882965', '2026-04-18 12:49:01.14+00', false, '2026-03-19 12:49:01.267885');
INSERT INTO public.refresh_tokens VALUES ('1327c57c-1391-4c28-bf67-0fd94f087974', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkOTJlNmUyYi0zYjIyLTQ0ZjktOTlmYy02MjY5N2NjNzM2OGQiLCJ0eXBlIjoicmVmcmVzaCIsImlhdCI6MTc3Mzk0MTY5NywiZXhwIjoxNzc2NTMzNjk3fQ.4nMR8lK73967rOAWv7F8C7NHMunKMwHZRIVbK1_RSzo', 'd92e6e2b-3b22-44f9-99fc-62697cc7368d', '2026-04-18 17:34:57.015+00', false, '2026-03-19 17:34:57.267738');
INSERT INTO public.refresh_tokens VALUES ('5e354194-f079-4fc3-a67a-2c5f21fc9f0d', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwMTNmNzMwMS03YzE3LTQwMWItODdiNS05N2NlMDk4ODI5NjUiLCJ0eXBlIjoicmVmcmVzaCIsImlhdCI6MTc3NDAwNzM3OSwiZXhwIjoxNzc2NTk5Mzc5fQ.YwUbmBv7Xay-D5B6-Po3sgFuwog5RQl8wpsbmbdLlAI', '013f7301-7c17-401b-87b5-97ce09882965', '2026-04-19 11:49:39.164+00', false, '2026-03-20 11:49:39.429925');
INSERT INTO public.refresh_tokens VALUES ('5fcc90b0-e934-400a-9853-6cd39430c3de', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkOTJlNmUyYi0zYjIyLTQ0ZjktOTlmYy02MjY5N2NjNzM2OGQiLCJ0eXBlIjoicmVmcmVzaCIsImlhdCI6MTc3NDAxMTI4OSwiZXhwIjoxNzc2NjAzMjg5fQ.MIOW6kS-mmYvV17aqfy0CwFWT3SluIyYRWcAloVGW2Q', 'd92e6e2b-3b22-44f9-99fc-62697cc7368d', '2026-04-19 12:54:49.79+00', false, '2026-03-20 12:54:49.898885');
INSERT INTO public.refresh_tokens VALUES ('a584077d-8b89-48e1-aeff-22dff7c9cb41', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwMTNmNzMwMS03YzE3LTQwMWItODdiNS05N2NlMDk4ODI5NjUiLCJ0eXBlIjoicmVmcmVzaCIsImlhdCI6MTc3NDAxMTkwNywiZXhwIjoxNzc2NjAzOTA3fQ.JSpAhpeLrjSTtwIdS205zBLyvF665LOGociv11HXAsA', '013f7301-7c17-401b-87b5-97ce09882965', '2026-04-19 13:05:07.97+00', false, '2026-03-20 13:05:08.06779');
INSERT INTO public.refresh_tokens VALUES ('e2e9fbcd-f934-44e3-a8d4-ec87749e336b', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkOTJlNmUyYi0zYjIyLTQ0ZjktOTlmYy02MjY5N2NjNzM2OGQiLCJ0eXBlIjoicmVmcmVzaCIsImlhdCI6MTc3NDQzOTAwOCwiZXhwIjoxNzc3MDMxMDA4fQ.4jCdV3J6GjR6cm--fwYyPU2G99pXsHgh7o6TqqGUX3s', 'd92e6e2b-3b22-44f9-99fc-62697cc7368d', '2026-04-24 11:43:28.391+00', false, '2026-03-25 11:43:30.522174');
INSERT INTO public.refresh_tokens VALUES ('35519d3b-c9d1-4c46-a5ea-7c16a2777d9d', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwMTNmNzMwMS03YzE3LTQwMWItODdiNS05N2NlMDk4ODI5NjUiLCJ0eXBlIjoicmVmcmVzaCIsImlhdCI6MTc3NDQ0MjgxOSwiZXhwIjoxNzc3MDM0ODE5fQ.s4Pp7ql-Fa5qDKOo5J5n63TsMhp_4A1N7QDlKw6uJAg', '013f7301-7c17-401b-87b5-97ce09882965', '2026-04-24 12:46:59.622+00', false, '2026-03-25 12:47:01.906628');
INSERT INTO public.refresh_tokens VALUES ('27e63dea-c2d7-40dc-8212-5e9238d709b4', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkOTJlNmUyYi0zYjIyLTQ0ZjktOTlmYy02MjY5N2NjNzM2OGQiLCJ0eXBlIjoicmVmcmVzaCIsImlhdCI6MTc3NDQ0Mzk3MSwiZXhwIjoxNzc3MDM1OTcxfQ.E74RMJyItscf-zm5hpQwn3jNgQGN-iSzhuhUk8BWOj8', 'd92e6e2b-3b22-44f9-99fc-62697cc7368d', '2026-04-24 13:06:11.587+00', false, '2026-03-25 13:06:13.893723');
INSERT INTO public.refresh_tokens VALUES ('c0b80110-cfa7-4901-adcf-70ffc787079f', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwMTNmNzMwMS03YzE3LTQwMWItODdiNS05N2NlMDk4ODI5NjUiLCJ0eXBlIjoicmVmcmVzaCIsImlhdCI6MTc3NDQ0ODU3NywiZXhwIjoxNzc3MDQwNTc3fQ.Bmu5eInfTAPKJuXplByTBGNY-0ITUJmEw08uM2MP5V0', '013f7301-7c17-401b-87b5-97ce09882965', '2026-04-24 14:22:57.325+00', true, '2026-03-25 14:22:59.48264');
INSERT INTO public.refresh_tokens VALUES ('ebc0bfdb-8c57-45b0-8c26-972fe60998b1', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwMTNmNzMwMS03YzE3LTQwMWItODdiNS05N2NlMDk4ODI5NjUiLCJ0eXBlIjoicmVmcmVzaCIsImlhdCI6MTc3NDQ0ODU5NCwiZXhwIjoxNzc3MDQwNTk0fQ.h3iVd64bFC6Vcf_0p4mTIMbJHrvV4PBncX4hsuJNk1A', '013f7301-7c17-401b-87b5-97ce09882965', '2026-04-24 14:23:14.501+00', false, '2026-03-25 14:23:16.652531');
INSERT INTO public.refresh_tokens VALUES ('79e16184-99a3-4057-9de6-1a0984bdb77d', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwMTNmNzMwMS03YzE3LTQwMWItODdiNS05N2NlMDk4ODI5NjUiLCJ0eXBlIjoicmVmcmVzaCIsImlhdCI6MTc3NDQ0ODYwNSwiZXhwIjoxNzc3MDQwNjA1fQ.XIpJuzhaKRJ1MzKnZcElwii0awqrWqO6v9E3m6cegtw', '013f7301-7c17-401b-87b5-97ce09882965', '2026-04-24 14:23:25.589+00', false, '2026-03-25 14:23:27.743018');
INSERT INTO public.refresh_tokens VALUES ('fb0ab405-1bb2-48e9-8600-03701d8ae757', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkOTJlNmUyYi0zYjIyLTQ0ZjktOTlmYy02MjY5N2NjNzM2OGQiLCJ0eXBlIjoicmVmcmVzaCIsImlhdCI6MTc3NDQ0OTUyMCwiZXhwIjoxNzc3MDQxNTIwfQ.DrQS1WZEO724CE1zrigJGqttWG3_FHP6Y-iYLENXuGo', 'd92e6e2b-3b22-44f9-99fc-62697cc7368d', '2026-04-24 14:38:40.497+00', false, '2026-03-25 14:38:42.645066');
INSERT INTO public.refresh_tokens VALUES ('0b9ce68e-8b1f-443e-85bb-556c548a3602', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkOTJlNmUyYi0zYjIyLTQ0ZjktOTlmYy02MjY5N2NjNzM2OGQiLCJ0eXBlIjoicmVmcmVzaCIsImlhdCI6MTc3NDU0OTQ2MCwiZXhwIjoxNzc3MTQxNDYwfQ.e0ZuFTcaOVBxoabNfPb1LUf8A34HiZb9MlsyDY_SflE', 'd92e6e2b-3b22-44f9-99fc-62697cc7368d', '2026-04-25 18:24:20.442+00', false, '2026-03-26 18:24:20.65282');
INSERT INTO public.refresh_tokens VALUES ('02a337b6-b3a2-4209-bba6-b3298c391127', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwMTNmNzMwMS03YzE3LTQwMWItODdiNS05N2NlMDk4ODI5NjUiLCJ0eXBlIjoicmVmcmVzaCIsImlhdCI6MTc3NDU0OTUxNywiZXhwIjoxNzc3MTQxNTE3fQ.-9TumlZKe-b-ojgCft88AJeGttwUz33ZNervawqgzCI', '013f7301-7c17-401b-87b5-97ce09882965', '2026-04-25 18:25:17.46+00', false, '2026-03-26 18:25:17.675116');
INSERT INTO public.refresh_tokens VALUES ('0b42e04c-cb6f-4ef9-a1f0-b2c3fa5e0f1d', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkOTJlNmUyYi0zYjIyLTQ0ZjktOTlmYy02MjY5N2NjNzM2OGQiLCJ0eXBlIjoicmVmcmVzaCIsImlhdCI6MTc3NDYxMjUzOCwiZXhwIjoxNzc3MjA0NTM4fQ.SIriznlpplXWXFDziLDomtYhEEtuKRNg54oqR_TGVMY', 'd92e6e2b-3b22-44f9-99fc-62697cc7368d', '2026-04-26 11:55:38.478+00', false, '2026-03-27 11:55:38.739871');
INSERT INTO public.refresh_tokens VALUES ('b99b1e93-1964-4e4d-a7a1-0380df42d78a', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkOTJlNmUyYi0zYjIyLTQ0ZjktOTlmYy02MjY5N2NjNzM2OGQiLCJ0eXBlIjoicmVmcmVzaCIsImlhdCI6MTc3NDYxMzkwMSwiZXhwIjoxNzc3MjA1OTAxfQ.1l80lp4sRDQC3_9rfmIMftFgkfJzixRcVKjCV-6SFWs', 'd92e6e2b-3b22-44f9-99fc-62697cc7368d', '2026-04-26 12:18:21.174+00', false, '2026-03-27 12:18:21.3763');
INSERT INTO public.refresh_tokens VALUES ('72d7f36e-5754-4509-a068-5c96aa791afa', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwMTNmNzMwMS03YzE3LTQwMWItODdiNS05N2NlMDk4ODI5NjUiLCJ0eXBlIjoicmVmcmVzaCIsImlhdCI6MTc3NDYxMzkyNywiZXhwIjoxNzc3MjA1OTI3fQ.HYQkAq8W4ONUHDQhV57zagOcKm2r7tDsxBfwt_ZW0TQ', '013f7301-7c17-401b-87b5-97ce09882965', '2026-04-26 12:18:47.438+00', false, '2026-03-27 12:18:47.630034');
INSERT INTO public.refresh_tokens VALUES ('49e2ce1b-864d-4688-9004-286439621a8d', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwMTNmNzMwMS03YzE3LTQwMWItODdiNS05N2NlMDk4ODI5NjUiLCJ0eXBlIjoicmVmcmVzaCIsImlhdCI6MTc3NDYxNTEyNiwiZXhwIjoxNzc3MjA3MTI2fQ.ahu5hCE5spMYHxgJivAOdru2tXqAWkdNV0XmiLjkX6A', '013f7301-7c17-401b-87b5-97ce09882965', '2026-04-26 12:38:46.72+00', false, '2026-03-27 12:38:46.837657');
INSERT INTO public.refresh_tokens VALUES ('9ad30a0c-8d9f-4571-b212-3223167f55f6', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkOTJlNmUyYi0zYjIyLTQ0ZjktOTlmYy02MjY5N2NjNzM2OGQiLCJ0eXBlIjoicmVmcmVzaCIsImlhdCI6MTc3NDYxNTIyNywiZXhwIjoxNzc3MjA3MjI3fQ.QIpijo7-3zr-7LqmMcdOp6N16zNhRUqA2OVDRhLKiFA', 'd92e6e2b-3b22-44f9-99fc-62697cc7368d', '2026-04-26 12:40:27.668+00', false, '2026-03-27 12:40:27.777167');
INSERT INTO public.refresh_tokens VALUES ('91f3239e-ecf6-40b2-9128-347c95cdbfbd', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkOTJlNmUyYi0zYjIyLTQ0ZjktOTlmYy02MjY5N2NjNzM2OGQiLCJ0eXBlIjoicmVmcmVzaCIsImlhdCI6MTc3NDYxOTU4NCwiZXhwIjoxNzc3MjExNTg0fQ.qiOXo-Qi7H1f8PhdzW2dqc6Bc5I2rT8Nqj_clE5Cq3g', 'd92e6e2b-3b22-44f9-99fc-62697cc7368d', '2026-04-26 13:53:04.926+00', false, '2026-03-27 13:53:05.078813');
INSERT INTO public.refresh_tokens VALUES ('f43ca017-79b2-4557-b4a5-0257bd47bbcd', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwMTNmNzMwMS03YzE3LTQwMWItODdiNS05N2NlMDk4ODI5NjUiLCJ0eXBlIjoicmVmcmVzaCIsImlhdCI6MTc3NDYyODQwOSwiZXhwIjoxNzc3MjIwNDA5fQ.1pscKIhLi9OfzIRjT5W_tDLwWu2oNLPkEv2-NfnFnG0', '013f7301-7c17-401b-87b5-97ce09882965', '2026-04-26 16:20:09.841+00', false, '2026-03-27 16:20:09.936232');
INSERT INTO public.refresh_tokens VALUES ('db27f2ab-5bd5-4830-b771-41ece529f74f', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwMTNmNzMwMS03YzE3LTQwMWItODdiNS05N2NlMDk4ODI5NjUiLCJ0eXBlIjoicmVmcmVzaCIsImlhdCI6MTc3Njg2NDY2NSwiZXhwIjoxNzc5NDU2NjY1fQ.I70SrwHUI64UMOgmDiU40YHkgeWg5eJWU_Upw7UxGbY', '013f7301-7c17-401b-87b5-97ce09882965', '2026-05-22 13:31:05.518+00', false, '2026-04-22 13:31:05.550245');


--
-- Data for Name: rentals; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.rentals VALUES ('68ff6292-54f2-4489-a8a3-477add75c7cc', 'bae7a29b-2022-46fa-b373-1ea3f59f92a6', '53180dd0-b96e-4d50-baf0-4668a52c6c82', '013f7301-7c17-401b-87b5-97ce09882965', '2026-03-10', '2026-03-15', 5, 25.00, 125.00, 'pending', NULL, NULL, NULL, NULL, NULL, 'expired', NULL, NULL, NULL, '2026-02-10 20:37:26.742+00', '2026-02-10 20:22:26.899234', '2026-02-10 20:52:00.278141');
INSERT INTO public.rentals VALUES ('eded5498-f5b4-4006-9e85-ebc88a11b11f', '698e9f7d-34c7-479a-8dbc-8c948ab7720b', 'd92e6e2b-3b22-44f9-99fc-62697cc7368d', '013f7301-7c17-401b-87b5-97ce09882965', '2026-04-21', '2026-04-22', 1, 150.00, 150.00, 'pending', NULL, NULL, NULL, NULL, NULL, 'expired', NULL, NULL, NULL, '2026-04-20 19:48:20.296+00', '2026-04-20 19:33:20.44591', '2026-04-20 19:49:01.253615');
INSERT INTO public.rentals VALUES ('10d40d50-12d3-4b8f-a9dd-27a3ac9f05b4', 'e34d17ba-2d70-4c4f-bffe-b0dacdc0bfc2', 'd92e6e2b-3b22-44f9-99fc-62697cc7368d', '013f7301-7c17-401b-87b5-97ce09882965', '2026-03-22', '2026-03-23', 1, 153.00, 153.00, 'pending', NULL, NULL, NULL, NULL, NULL, 'expired', NULL, NULL, NULL, '2026-03-20 13:00:19.621+00', '2026-03-20 12:55:19.733176', '2026-03-20 14:36:00.302462');
INSERT INTO public.rentals VALUES ('9a3be415-cfef-4e2f-8e37-c064fc473b96', 'e34d17ba-2d70-4c4f-bffe-b0dacdc0bfc2', 'd92e6e2b-3b22-44f9-99fc-62697cc7368d', '013f7301-7c17-401b-87b5-97ce09882965', '2026-03-24', '2026-03-25', 1, 153.00, 153.00, 'pending', NULL, NULL, NULL, NULL, NULL, 'expired', NULL, NULL, NULL, '2026-03-20 13:14:25.12+00', '2026-03-20 13:09:25.215835', '2026-03-20 14:36:00.302462');
INSERT INTO public.rentals VALUES ('4be1cabc-8f48-4a24-85ce-b6eb8855e9f8', 'e34d17ba-2d70-4c4f-bffe-b0dacdc0bfc2', 'd92e6e2b-3b22-44f9-99fc-62697cc7368d', '013f7301-7c17-401b-87b5-97ce09882965', '2026-03-29', '2026-03-30', 1, 153.00, 153.00, 'pending', NULL, NULL, NULL, NULL, NULL, 'expired', NULL, NULL, NULL, '2026-03-20 14:23:29.558+00', '2026-03-20 14:18:29.786077', '2026-03-20 14:36:00.302462');
INSERT INTO public.rentals VALUES ('1e0d7b7a-73f5-44b7-a958-208c47c10338', 'e34d17ba-2d70-4c4f-bffe-b0dacdc0bfc2', 'd92e6e2b-3b22-44f9-99fc-62697cc7368d', '013f7301-7c17-401b-87b5-97ce09882965', '2026-03-26', '2026-03-27', 1, 153.00, 153.00, 'pending', NULL, NULL, NULL, NULL, NULL, 'expired', NULL, NULL, NULL, '2026-03-20 14:30:25.649+00', '2026-03-20 14:25:25.888108', '2026-03-20 14:36:00.302462');
INSERT INTO public.rentals VALUES ('4e692022-dc18-4f37-a2fa-a044b71b8831', 'e34d17ba-2d70-4c4f-bffe-b0dacdc0bfc2', 'd92e6e2b-3b22-44f9-99fc-62697cc7368d', '013f7301-7c17-401b-87b5-97ce09882965', '2026-03-26', '2026-03-27', 1, 153.00, 153.00, 'pending', NULL, NULL, NULL, NULL, NULL, 'expired', NULL, NULL, NULL, '2026-03-20 17:55:11.091+00', '2026-03-20 17:50:11.225969', '2026-03-20 17:51:30.301138');
INSERT INTO public.rentals VALUES ('2adf0a29-796d-4fbe-a66d-842630c42332', 'e34d17ba-2d70-4c4f-bffe-b0dacdc0bfc2', 'd92e6e2b-3b22-44f9-99fc-62697cc7368d', '013f7301-7c17-401b-87b5-97ce09882965', '2026-03-26', '2026-03-27', 1, 153.00, 153.00, 'pending', NULL, NULL, NULL, NULL, NULL, 'expired', NULL, NULL, NULL, '2026-03-20 17:59:41.059+00', '2026-03-20 17:54:41.192788', '2026-03-20 17:55:12.36735');
INSERT INTO public.rentals VALUES ('d46d82b3-0c90-4863-8e39-bab1ccdf26ca', 'e34d17ba-2d70-4c4f-bffe-b0dacdc0bfc2', 'd92e6e2b-3b22-44f9-99fc-62697cc7368d', '013f7301-7c17-401b-87b5-97ce09882965', '2026-03-29', '2026-03-30', 1, 153.00, 153.00, 'pending', NULL, NULL, NULL, NULL, NULL, 'expired', NULL, NULL, NULL, '2026-03-20 18:18:22.929+00', '2026-03-20 18:13:23.11931', '2026-03-20 18:14:02.2167');
INSERT INTO public.rentals VALUES ('386f904c-a8e1-48fa-bd72-f5de2ddd074a', 'e34d17ba-2d70-4c4f-bffe-b0dacdc0bfc2', 'd92e6e2b-3b22-44f9-99fc-62697cc7368d', '013f7301-7c17-401b-87b5-97ce09882965', '2026-04-29', '2026-04-30', 1, 153.00, 153.00, 'paid', 'pi_3TOO31PWdiCF3nqL1lexjlpV', NULL, '2026-04-20 20:04:02.056+00', 153.00, '2026-04-22 12:39:19.246+00', 'cancelled_by_owner', '2026-04-22 12:39:19.246+00', '013f7301-7c17-401b-87b5-97ce09882965', NULL, NULL, '2026-04-20 20:03:28.751724', '2026-04-22 12:39:19.34353');
INSERT INTO public.rentals VALUES ('4af87c2d-2a2f-449f-a7f0-5d116eb72070', '698e9f7d-34c7-479a-8dbc-8c948ab7720b', 'd92e6e2b-3b22-44f9-99fc-62697cc7368d', '013f7301-7c17-401b-87b5-97ce09882965', '2026-04-23', '2026-04-24', 1, 150.00, 150.00, 'paid', 'pi_3TONpIPWdiCF3nqL3ruivn0D', NULL, '2026-04-20 19:49:50.14+00', 150.00, '2026-04-22 12:46:37.609+00', 'cancelled_by_owner', '2026-04-22 12:46:37.609+00', '013f7301-7c17-401b-87b5-97ce09882965', NULL, NULL, '2026-04-20 19:49:24.955611', '2026-04-22 12:46:37.709821');
INSERT INTO public.rentals VALUES ('3fb9ba77-84d7-4a2c-8415-e194334228e7', 'e34d17ba-2d70-4c4f-bffe-b0dacdc0bfc2', 'd92e6e2b-3b22-44f9-99fc-62697cc7368d', '013f7301-7c17-401b-87b5-97ce09882965', '2026-03-26', '2026-03-27', 1, 153.00, 153.00, 'pending', NULL, NULL, NULL, NULL, NULL, 'expired', NULL, NULL, NULL, '2026-03-20 19:46:52.796+00', '2026-03-20 19:41:53.013387', '2026-03-20 19:50:20.470778');
INSERT INTO public.rentals VALUES ('20d0a309-3040-4b9d-ba08-f969a2ccf429', 'e34d17ba-2d70-4c4f-bffe-b0dacdc0bfc2', 'd92e6e2b-3b22-44f9-99fc-62697cc7368d', '013f7301-7c17-401b-87b5-97ce09882965', '2026-04-24', '2026-04-25', 1, 153.00, 153.00, 'paid', 'pi_3TP0p5PWdiCF3nqL2O2t3xU5', NULL, '2026-04-22 13:28:12.954+00', NULL, NULL, 'confirmed', NULL, NULL, NULL, NULL, '2026-04-22 13:27:46.865189', '2026-04-22 13:28:13.056995');
INSERT INTO public.rentals VALUES ('64dd7398-4cf6-4130-9bcb-6c0964ca9bc2', 'e34d17ba-2d70-4c4f-bffe-b0dacdc0bfc2', 'd92e6e2b-3b22-44f9-99fc-62697cc7368d', '013f7301-7c17-401b-87b5-97ce09882965', '2026-03-20', '2026-03-21', 1, 153.00, 153.00, 'paid', NULL, NULL, '2026-03-19 17:40:51.747+00', NULL, NULL, 'completed', NULL, NULL, NULL, NULL, '2026-03-19 17:40:51.086562', '2026-03-27 14:17:01.642833');
INSERT INTO public.rentals VALUES ('9e54969f-cf75-4a29-846f-387d3410dc3d', 'e34d17ba-2d70-4c4f-bffe-b0dacdc0bfc2', 'd92e6e2b-3b22-44f9-99fc-62697cc7368d', '013f7301-7c17-401b-87b5-97ce09882965', '2026-03-22', '2026-03-23', 1, 153.00, 153.00, 'paid', 'pi_3TD6zKPWdiCF3nqL2BQ3CKDn', NULL, '2026-03-20 17:37:36.626+00', NULL, NULL, 'completed', NULL, NULL, NULL, NULL, '2026-03-20 17:37:12.351141', '2026-03-27 14:17:01.642833');
INSERT INTO public.rentals VALUES ('16d6bd55-043d-466a-bac2-1cccfb17b6c1', 'e34d17ba-2d70-4c4f-bffe-b0dacdc0bfc2', 'd92e6e2b-3b22-44f9-99fc-62697cc7368d', '013f7301-7c17-401b-87b5-97ce09882965', '2026-03-24', '2026-03-25', 1, 153.00, 153.00, 'paid', 'pi_3TD7AVPWdiCF3nqL1ITGLDZe', NULL, '2026-03-20 17:49:09.302+00', NULL, NULL, 'completed', NULL, NULL, NULL, NULL, '2026-03-20 17:48:33.245471', '2026-03-27 14:17:01.642833');
INSERT INTO public.rentals VALUES ('3fc449fb-639b-42f9-b581-484d21cc7fdf', 'e34d17ba-2d70-4c4f-bffe-b0dacdc0bfc2', 'd92e6e2b-3b22-44f9-99fc-62697cc7368d', '013f7301-7c17-401b-87b5-97ce09882965', '2026-04-01', '2026-04-02', 1, 153.00, 153.00, 'paid', 'pi_3TD47jPWdiCF3nqL30bWopls', NULL, '2026-03-20 14:34:06.356+00', NULL, NULL, 'completed', NULL, NULL, NULL, NULL, '2026-03-20 14:33:27.346329', '2026-04-09 16:49:00.45275');
INSERT INTO public.rentals VALUES ('20aa1ab5-a95c-403e-a262-472855b6127b', 'e34d17ba-2d70-4c4f-bffe-b0dacdc0bfc2', 'd92e6e2b-3b22-44f9-99fc-62697cc7368d', '013f7301-7c17-401b-87b5-97ce09882965', '2026-04-05', '2026-04-06', 1, 153.00, 153.00, 'paid', 'pi_3TD4DdPWdiCF3nqL118DGcHm', NULL, '2026-03-20 14:40:11.794+00', NULL, NULL, 'completed', NULL, NULL, NULL, NULL, '2026-03-20 14:39:41.737966', '2026-04-09 16:49:00.45275');
INSERT INTO public.rentals VALUES ('13a1be3a-c632-4382-9315-78eef28d7a8f', 'e34d17ba-2d70-4c4f-bffe-b0dacdc0bfc2', 'd92e6e2b-3b22-44f9-99fc-62697cc7368d', '013f7301-7c17-401b-87b5-97ce09882965', '2026-03-29', '2026-03-30', 1, 153.00, 153.00, 'paid', 'pi_3TD8uGPWdiCF3nqL2dpbNaod', NULL, '2026-03-20 19:40:30.017+00', NULL, NULL, 'completed', NULL, NULL, NULL, NULL, '2026-03-20 19:39:52.726451', '2026-04-09 16:49:00.45275');


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.users VALUES ('53180dd0-b96e-4d50-baf0-4668a52c6c82', '$2b$10$89x.0jG2naKnhY.dnBcfMen1xatMkJMelJZb2jExP1AnUUdWYvbVa', 'local', NULL, true, false, 'test@example.com', NULL, '2026-03-20 11:55:51.739764', '2026-03-20 11:55:51.739764', NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.users VALUES ('b10633be-0115-4063-9f7c-5e3a1871b9b9', '$2b$10$6NQD9Nv0q6wIJEItX8l.vObzVPhKexBGAFD8SoE1ZVBehCjFqtcFS', 'local', NULL, true, false, 'test@example4.com', NULL, '2026-03-20 11:55:51.739764', '2026-03-20 11:55:51.739764', NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.users VALUES ('90d84c88-6a37-42ae-a007-ea24ef7eb400', NULL, 'google', '102848162996081392651', true, true, 'willygearsofwar@gmail.com', NULL, '2026-03-20 11:55:51.739764', '2026-03-20 11:55:51.739764', NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.users VALUES ('7db41e87-3cc7-401c-af70-dee5f2149921', NULL, 'google', '114317162769429238710', true, true, 'wminfinixsoft@gmail.com', NULL, '2026-03-20 11:55:51.739764', '2026-03-20 11:55:51.739764', NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.users VALUES ('a8c356e8-e161-4b72-a812-64d998934e40', NULL, 'google', '113808121279818177761', true, true, 'wminfinixsoft23@gmail.com', NULL, '2026-04-09 16:50:20.169902', '2026-04-09 16:50:20.169902', NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.users VALUES ('d92e6e2b-3b22-44f9-99fc-62697cc7368d', '$2b$10$VBIXjyBfrfz5hXLCY3Jdx.I3nst9Dbw08LdsPkjWgXdRA3USwWAlm', 'local', NULL, true, false, 'test@example2.com', NULL, '2026-03-20 11:55:51.739764', '2026-04-21 20:36:02.662998', 'Kevin', 'Page', '1995-02-01', '', NULL, 'https://res.cloudinary.com/dlbrumij2/image/upload/v1776803761/bag_rental/tc3ipxeac1x9fwqk2cic.png', 'Los Angeles, CA');
INSERT INTO public.users VALUES ('013f7301-7c17-401b-87b5-97ce09882965', '$2b$10$RiBiY245nwUQYglE/7BUpeO.aAidfOoEkm4brA.sWM7HewM9UoilC', 'local', NULL, true, false, 'test@example3.com', 'acct_1TD1f0BqsvOg5cmb', '2026-03-20 11:55:51.739764', '2026-04-22 13:25:08.427407', 'William', 'Page', '1991-01-22', '+541133258598', 'Michigan, LA', 'https://res.cloudinary.com/dlbrumij2/image/upload/v1774548945/bag_rental/z1e1eydswkehedz3joiu.png', '');


--
-- Name: notifications PK_6a72c3c0f683f6462415e653c3a; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT "PK_6a72c3c0f683f6462415e653c3a" PRIMARY KEY (id);


--
-- Name: refresh_tokens PK_7d8bee0204106019488c4c50ffa; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT "PK_7d8bee0204106019488c4c50ffa" PRIMARY KEY (id);


--
-- Name: club_iron_details UQ_0df909403ea1983ed57f7d60647; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.club_iron_details
    ADD CONSTRAINT "UQ_0df909403ea1983ed57f7d60647" UNIQUE (club_id);


--
-- Name: favorites UQ_0f8db9b83a100398d2611a8c9d0; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT "UQ_0f8db9b83a100398d2611a8c9d0" UNIQUE (user_id, listing_id);


--
-- Name: club_putter_details UQ_432db4ef798c1aab89498a99d3a; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.club_putter_details
    ADD CONSTRAINT "UQ_432db4ef798c1aab89498a99d3a" UNIQUE (club_id);


--
-- Name: club_hybrid_details UQ_84c39197c329fad30c8c4ef0674; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.club_hybrid_details
    ADD CONSTRAINT "UQ_84c39197c329fad30c8c4ef0674" UNIQUE (club_id);


--
-- Name: users UQ_97672ac88f789774dd47f7c8be3; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE (email);


--
-- Name: club_wedge_details UQ_a18d4b98e20391fb06acdbf6129; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.club_wedge_details
    ADD CONSTRAINT "UQ_a18d4b98e20391fb06acdbf6129" UNIQUE (club_id);


--
-- Name: club_wood_details UQ_c40698e8ee1f812f5c6c9fc9b1e; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.club_wood_details
    ADD CONSTRAINT "UQ_c40698e8ee1f812f5c6c9fc9b1e" UNIQUE (club_id);


--
-- Name: bag_listings bag_listings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bag_listings
    ADD CONSTRAINT bag_listings_pkey PRIMARY KEY (id);


--
-- Name: club_hybrid_details club_hybrid_details_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.club_hybrid_details
    ADD CONSTRAINT club_hybrid_details_pkey PRIMARY KEY (id);


--
-- Name: club_iron_details club_iron_details_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.club_iron_details
    ADD CONSTRAINT club_iron_details_pkey PRIMARY KEY (id);


--
-- Name: club_putter_details club_putter_details_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.club_putter_details
    ADD CONSTRAINT club_putter_details_pkey PRIMARY KEY (id);


--
-- Name: club_wedge_details club_wedge_details_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.club_wedge_details
    ADD CONSTRAINT club_wedge_details_pkey PRIMARY KEY (id);


--
-- Name: club_wood_details club_wood_details_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.club_wood_details
    ADD CONSTRAINT club_wood_details_pkey PRIMARY KEY (id);


--
-- Name: clubs clubs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clubs
    ADD CONSTRAINT clubs_pkey PRIMARY KEY (id);


--
-- Name: favorites favorites_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT favorites_pkey PRIMARY KEY (id);


--
-- Name: rentals rentals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rentals
    ADD CONSTRAINT rentals_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: IDX_310667f935698fcd8cb319113a; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_310667f935698fcd8cb319113a" ON public.notifications USING btree (user_id, created_at);


--
-- Name: IDX_af08fad7c04bb85403970afdc1; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_af08fad7c04bb85403970afdc1" ON public.notifications USING btree (user_id, is_read);


--
-- Name: rentals prevent_rental_overlap; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER prevent_rental_overlap BEFORE INSERT OR UPDATE ON public.rentals FOR EACH ROW EXECUTE FUNCTION public.check_rental_overlap();


--
-- Name: bag_listings update_bag_listings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_bag_listings_updated_at BEFORE UPDATE ON public.bag_listings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: clubs update_clubs_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_clubs_updated_at BEFORE UPDATE ON public.clubs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: rentals update_rentals_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_rentals_updated_at BEFORE UPDATE ON public.rentals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: users update_users_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: rentals FK_0a8a10f69a54df18ccb1af6bf0d; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rentals
    ADD CONSTRAINT "FK_0a8a10f69a54df18ccb1af6bf0d" FOREIGN KEY (renter_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: club_iron_details FK_0df909403ea1983ed57f7d60647; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.club_iron_details
    ADD CONSTRAINT "FK_0df909403ea1983ed57f7d60647" FOREIGN KEY (club_id) REFERENCES public.clubs(id) ON DELETE CASCADE;


--
-- Name: rentals FK_3428b9fefb78d5253b3f7c05087; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rentals
    ADD CONSTRAINT "FK_3428b9fefb78d5253b3f7c05087" FOREIGN KEY (listing_id) REFERENCES public.bag_listings(id) ON DELETE CASCADE;


--
-- Name: favorites FK_35a6b05ee3b624d0de01ee50593; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT "FK_35a6b05ee3b624d0de01ee50593" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: refresh_tokens FK_3ddc983c5f7bcf132fd8732c3f4; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT "FK_3ddc983c5f7bcf132fd8732c3f4" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: club_putter_details FK_432db4ef798c1aab89498a99d3a; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.club_putter_details
    ADD CONSTRAINT "FK_432db4ef798c1aab89498a99d3a" FOREIGN KEY (club_id) REFERENCES public.clubs(id) ON DELETE CASCADE;


--
-- Name: bag_listings FK_459873b5fff01c62585e8267c30; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bag_listings
    ADD CONSTRAINT "FK_459873b5fff01c62585e8267c30" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: favorites FK_74e0699c35d78e39b229d64f34f; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT "FK_74e0699c35d78e39b229d64f34f" FOREIGN KEY (listing_id) REFERENCES public.bag_listings(id) ON DELETE CASCADE;


--
-- Name: club_hybrid_details FK_84c39197c329fad30c8c4ef0674; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.club_hybrid_details
    ADD CONSTRAINT "FK_84c39197c329fad30c8c4ef0674" FOREIGN KEY (club_id) REFERENCES public.clubs(id) ON DELETE CASCADE;


--
-- Name: notifications FK_9a8a82462cab47c73d25f49261f; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT "FK_9a8a82462cab47c73d25f49261f" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: club_wedge_details FK_a18d4b98e20391fb06acdbf6129; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.club_wedge_details
    ADD CONSTRAINT "FK_a18d4b98e20391fb06acdbf6129" FOREIGN KEY (club_id) REFERENCES public.clubs(id) ON DELETE CASCADE;


--
-- Name: clubs FK_a4b5da3c9d54523e0cf779a7c6c; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clubs
    ADD CONSTRAINT "FK_a4b5da3c9d54523e0cf779a7c6c" FOREIGN KEY (bag_listing_id) REFERENCES public.bag_listings(id) ON DELETE CASCADE;


--
-- Name: notifications FK_b817655a5bd4d3af51c7a68c5da; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT "FK_b817655a5bd4d3af51c7a68c5da" FOREIGN KEY (rental_id) REFERENCES public.rentals(id) ON DELETE SET NULL;


--
-- Name: club_wood_details FK_c40698e8ee1f812f5c6c9fc9b1e; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.club_wood_details
    ADD CONSTRAINT "FK_c40698e8ee1f812f5c6c9fc9b1e" FOREIGN KEY (club_id) REFERENCES public.clubs(id) ON DELETE CASCADE;


--
-- Name: rentals FK_f849174955881019a17d88c8b92; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rentals
    ADD CONSTRAINT "FK_f849174955881019a17d88c8b92" FOREIGN KEY (owner_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict A0OpV4g2QFWYpcCFE3oJBtgsQZiJMgbsHIIx5oPMSBj061Hyn9SefoJ2bPYFLhm

