CREATE EXTENSION IF NOT EXISTS "pg_cron";
CREATE EXTENSION IF NOT EXISTS "pg_graphql";
CREATE EXTENSION IF NOT EXISTS "pg_net";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql";
CREATE EXTENSION IF NOT EXISTS "supabase_vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
BEGIN;

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

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
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'moderator',
    'user'
);


--
-- Name: friend_request_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.friend_request_status AS ENUM (
    'pending',
    'accepted',
    'declined'
);


--
-- Name: accept_friend_request(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.accept_friend_request(p_request_id uuid, p_wallet_address text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_request record;
  v_is_authed boolean;
BEGIN
  IF p_wallet_address IS NULL OR p_wallet_address = '' THEN
    RETURN json_build_object('success', false, 'error', 'Wallet address required');
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.user_profiles
    WHERE wallet_address = p_wallet_address
      AND auth_user_id = auth.uid()
  ) INTO v_is_authed;

  IF NOT v_is_authed THEN
    RETURN json_build_object('success', false, 'error', 'Not authorized');
  END IF;

  SELECT id, requester_wallet, requested_wallet, status
    INTO v_request
  FROM public.friend_requests
  WHERE id = p_request_id;

  IF v_request.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Request not found');
  END IF;

  IF v_request.requested_wallet <> p_wallet_address THEN
    RETURN json_build_object('success', false, 'error', 'Not authorized');
  END IF;

  IF v_request.status <> 'pending' THEN
    RETURN json_build_object('success', false, 'error', 'Request already processed');
  END IF;

  UPDATE public.friend_requests
  SET status = 'accepted', responded_at = now()
  WHERE id = p_request_id;

  -- Create mutual friendship
  INSERT INTO public.user_friends (user_wallet, friend_wallet)
  VALUES (v_request.requester_wallet, v_request.requested_wallet)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.user_friends (user_wallet, friend_wallet)
  VALUES (v_request.requested_wallet, v_request.requester_wallet)
  ON CONFLICT DO NOTHING;

  RETURN json_build_object('success', true);
END;
$$;


--
-- Name: admin_delete_bounty(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_delete_bounty(p_bounty_id uuid, p_wallet_address text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_is_admin boolean;
BEGIN
  -- Validate inputs
  IF p_wallet_address IS NULL OR p_wallet_address = '' THEN
    RETURN json_build_object('success', false, 'error', 'Wallet address required');
  END IF;

  -- Check if wallet is admin
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE wallet_address = p_wallet_address AND role = 'admin'
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RETURN json_build_object('success', false, 'error', 'Not authorized - admin only');
  END IF;

  -- First delete related submissions
  DELETE FROM public.bounty_submissions WHERE bounty_id = p_bounty_id;
  
  -- Delete the bounty
  DELETE FROM public.bounties WHERE id = p_bounty_id;

  RETURN json_build_object('success', true);
END;
$$;


--
-- Name: admin_delete_comment(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_delete_comment(p_comment_id uuid, p_wallet_address text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_is_admin boolean;
BEGIN
  -- Validate inputs
  IF p_wallet_address IS NULL OR p_wallet_address = '' THEN
    RETURN json_build_object('success', false, 'error', 'Wallet address required');
  END IF;

  -- Check if wallet is admin
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE wallet_address = p_wallet_address AND role = 'admin'
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RETURN json_build_object('success', false, 'error', 'Not authorized - admin only');
  END IF;

  -- Delete the comment
  DELETE FROM public.kol_comments WHERE id = p_comment_id;

  RETURN json_build_object('success', true);
END;
$$;


--
-- Name: admin_delete_kol(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_delete_kol(p_kol_id uuid, p_wallet_address text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_is_admin boolean;
BEGIN
  -- Validate inputs
  IF p_wallet_address IS NULL OR p_wallet_address = '' THEN
    RETURN json_build_object('success', false, 'error', 'Wallet address required');
  END IF;

  -- Check if wallet is admin
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE wallet_address = p_wallet_address AND role = 'admin'
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RETURN json_build_object('success', false, 'error', 'Not authorized - admin only');
  END IF;

  -- Delete related data first
  DELETE FROM public.kol_comments WHERE kol_id = p_kol_id;
  DELETE FROM public.kol_votes WHERE kol_id = p_kol_id;
  DELETE FROM public.kol_pnl_snapshots WHERE kol_id = p_kol_id;
  DELETE FROM public.wallet_verifications WHERE kol_id = p_kol_id;
  
  -- Delete the KOL
  DELETE FROM public.kols WHERE id = p_kol_id;

  RETURN json_build_object('success', true);
END;
$$;


--
-- Name: admin_delete_submission(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_delete_submission(p_submission_id uuid, p_wallet_address text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_is_admin boolean;
BEGIN
  -- Validate inputs
  IF p_wallet_address IS NULL OR p_wallet_address = '' THEN
    RETURN json_build_object('success', false, 'error', 'Wallet address required');
  END IF;

  -- Check if wallet is admin
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE wallet_address = p_wallet_address AND role = 'admin'
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RETURN json_build_object('success', false, 'error', 'Not authorized - admin only');
  END IF;

  -- Delete the submission
  DELETE FROM public.bounty_submissions WHERE id = p_submission_id;

  RETURN json_build_object('success', true);
END;
$$;


--
-- Name: cleanup_expired_bounties(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_expired_bounties() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  DELETE FROM public.bounties 
  WHERE expires_at IS NOT NULL 
    AND expires_at < now() 
    AND status = 'open';
END;
$$;


--
-- Name: decline_friend_request(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.decline_friend_request(p_request_id uuid, p_wallet_address text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_request record;
  v_is_authed boolean;
BEGIN
  IF p_wallet_address IS NULL OR p_wallet_address = '' THEN
    RETURN json_build_object('success', false, 'error', 'Wallet address required');
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.user_profiles
    WHERE wallet_address = p_wallet_address
      AND auth_user_id = auth.uid()
  ) INTO v_is_authed;

  IF NOT v_is_authed THEN
    RETURN json_build_object('success', false, 'error', 'Not authorized');
  END IF;

  SELECT id, requester_wallet, requested_wallet, status
    INTO v_request
  FROM public.friend_requests
  WHERE id = p_request_id;

  IF v_request.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Request not found');
  END IF;

  IF v_request.requested_wallet <> p_wallet_address THEN
    RETURN json_build_object('success', false, 'error', 'Not authorized');
  END IF;

  IF v_request.status <> 'pending' THEN
    RETURN json_build_object('success', false, 'error', 'Request already processed');
  END IF;

  UPDATE public.friend_requests
  SET status = 'declined', responded_at = now()
  WHERE id = p_request_id;

  RETURN json_build_object('success', true);
END;
$$;


--
-- Name: delete_bounty_submission(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.delete_bounty_submission(p_submission_id uuid, p_wallet_address text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_submission_wallet text;
  v_bounty_creator_wallet text;
  v_bounty_id uuid;
BEGIN
  -- Validate inputs
  IF p_wallet_address IS NULL OR p_wallet_address = '' THEN
    RETURN json_build_object('success', false, 'error', 'Wallet address required');
  END IF;

  -- Get submission details
  SELECT wallet_address, bounty_id INTO v_submission_wallet, v_bounty_id
  FROM public.bounty_submissions
  WHERE id = p_submission_id;

  IF v_submission_wallet IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Submission not found');
  END IF;

  -- Get bounty creator
  SELECT wallet_address INTO v_bounty_creator_wallet
  FROM public.bounties
  WHERE id = v_bounty_id;

  -- Check authorization: submission owner OR bounty creator
  IF v_submission_wallet != p_wallet_address AND v_bounty_creator_wallet != p_wallet_address THEN
    RETURN json_build_object('success', false, 'error', 'Not authorized to delete this submission');
  END IF;

  -- Delete the submission
  DELETE FROM public.bounty_submissions WHERE id = p_submission_id;

  RETURN json_build_object('success', true);
END;
$$;


--
-- Name: delete_comment(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.delete_comment(p_comment_id uuid, p_wallet_address text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_comment_wallet text;
BEGIN
  -- Validate inputs
  IF p_wallet_address IS NULL OR p_wallet_address = '' THEN
    RETURN json_build_object('success', false, 'error', 'Wallet address required');
  END IF;

  -- Check if comment exists and belongs to the wallet
  SELECT wallet_address INTO v_comment_wallet
  FROM public.kol_comments
  WHERE id = p_comment_id;

  IF v_comment_wallet IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Comment not found');
  END IF;

  IF v_comment_wallet != p_wallet_address THEN
    RETURN json_build_object('success', false, 'error', 'Not authorized to delete this comment');
  END IF;

  -- Delete the comment
  DELETE FROM public.kol_comments WHERE id = p_comment_id;

  RETURN json_build_object('success', true);
END;
$$;


--
-- Name: has_role(text, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_wallet_address text, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE wallet_address = _wallet_address
      AND role = _role
  )
$$;


--
-- Name: is_admin_wallet(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_admin_wallet(wallet_address text) RETURNS boolean
    LANGUAGE sql STABLE
    SET search_path TO 'public'
    AS $$
  SELECT wallet_address = '96HvKxa7FzbSsSK2nD4Yc1AtdMNUUUoqb37dyNKNJsrV'
$$;


--
-- Name: remove_friend(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.remove_friend(p_user_wallet text, p_friend_wallet text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_deleted int;
BEGIN
  IF p_user_wallet IS NULL OR p_user_wallet = '' THEN
    RETURN json_build_object('success', false, 'error', 'User wallet address required');
  END IF;

  IF p_friend_wallet IS NULL OR p_friend_wallet = '' THEN
    RETURN json_build_object('success', false, 'error', 'Friend wallet address required');
  END IF;

  DELETE FROM public.user_friends
  WHERE (user_wallet = p_user_wallet AND friend_wallet = p_friend_wallet)
     OR (user_wallet = p_friend_wallet AND friend_wallet = p_user_wallet);

  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  IF v_deleted = 0 THEN
    RETURN json_build_object('success', false, 'error', 'Friendship not found');
  END IF;

  RETURN json_build_object('success', true);
END;
$$;


--
-- Name: update_app_settings_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_app_settings_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: update_kol_rating_from_comment(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_kol_rating_from_comment() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_avg_rating numeric;
BEGIN
  -- Calculate average rating only from verified users' comments
  -- A user is verified if they have a user_profile with is_verified = true
  SELECT AVG(c.rating)::numeric INTO v_avg_rating
  FROM public.kol_comments c
  INNER JOIN public.user_profiles up ON up.wallet_address = c.wallet_address
  WHERE c.kol_id = NEW.kol_id 
    AND c.rating IS NOT NULL 
    AND c.rating > 0
    AND up.is_verified = true;
  
  -- Update KOL rating if we have valid ratings from verified users
  IF v_avg_rating IS NOT NULL THEN
    UPDATE public.kols
    SET rating = ROUND(v_avg_rating, 1)
    WHERE id = NEW.kol_id;
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: update_pnl_snapshot_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_pnl_snapshot_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: update_user_profiles_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_user_profiles_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: vote_for_kol(uuid, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.vote_for_kol(p_kol_id uuid, p_wallet_address text, p_vote_type text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_existing_vote_id uuid;
  v_existing_vote_type text;
  v_last_vote_at timestamp with time zone;
  v_kol_record record;
  v_result json;
  v_minutes_since_last_vote numeric;
BEGIN
  -- Validate inputs
  IF p_vote_type NOT IN ('up', 'down') THEN
    RETURN json_build_object('success', false, 'error', 'Invalid vote type');
  END IF;
  
  IF p_wallet_address IS NULL OR p_wallet_address = '' THEN
    RETURN json_build_object('success', false, 'error', 'Wallet address required');
  END IF;

  -- Check if KOL exists
  SELECT id, rating, total_votes, upvotes, downvotes INTO v_kol_record
  FROM public.kols WHERE id = p_kol_id;
  
  IF v_kol_record IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'KOL not found');
  END IF;

  -- Check for existing vote and rate limit (15 minutes)
  SELECT id, vote_type, COALESCE(last_vote_at, created_at) INTO v_existing_vote_id, v_existing_vote_type, v_last_vote_at
  FROM public.kol_votes 
  WHERE kol_id = p_kol_id AND wallet_address = p_wallet_address;

  IF v_existing_vote_id IS NOT NULL THEN
    -- Check rate limit
    v_minutes_since_last_vote := EXTRACT(EPOCH FROM (now() - v_last_vote_at)) / 60;
    
    IF v_minutes_since_last_vote < 15 THEN
      RETURN json_build_object(
        'success', false, 
        'error', 'Rate limited', 
        'cooldown_remaining', CEIL(15 - v_minutes_since_last_vote)
      );
    END IF;
  END IF;

  IF v_existing_vote_id IS NOT NULL THEN
    -- User already voted - update their vote
    IF v_existing_vote_type = p_vote_type THEN
      -- Same vote type, just update the timestamp and increment count again
      UPDATE public.kol_votes 
      SET last_vote_at = now() 
      WHERE id = v_existing_vote_id;
      
      -- Increment the same vote type
      IF p_vote_type = 'up' THEN
        UPDATE public.kols 
        SET upvotes = COALESCE(upvotes, 0) + 1
        WHERE id = p_kol_id;
      ELSE
        UPDATE public.kols 
        SET downvotes = COALESCE(downvotes, 0) + 1
        WHERE id = p_kol_id;
      END IF;
    ELSE
      -- Different vote type - switch the vote
      UPDATE public.kol_votes 
      SET vote_type = p_vote_type, last_vote_at = now()
      WHERE id = v_existing_vote_id;
      
      -- Decrease old vote type, increase new vote type
      IF p_vote_type = 'up' THEN
        UPDATE public.kols 
        SET 
          upvotes = COALESCE(upvotes, 0) + 1,
          downvotes = GREATEST(0, COALESCE(downvotes, 0) - 1)
        WHERE id = p_kol_id;
      ELSE
        UPDATE public.kols 
        SET 
          downvotes = COALESCE(downvotes, 0) + 1,
          upvotes = GREATEST(0, COALESCE(upvotes, 0) - 1)
        WHERE id = p_kol_id;
      END IF;
    END IF;
  ELSE
    -- New vote
    INSERT INTO public.kol_votes (kol_id, wallet_address, vote_type, last_vote_at)
    VALUES (p_kol_id, p_wallet_address, p_vote_type, now());
    
    -- Increment the appropriate vote count and total votes
    IF p_vote_type = 'up' THEN
      UPDATE public.kols 
      SET 
        upvotes = COALESCE(upvotes, 0) + 1,
        total_votes = COALESCE(total_votes, 0) + 1
      WHERE id = p_kol_id;
    ELSE
      UPDATE public.kols 
      SET 
        downvotes = COALESCE(downvotes, 0) + 1,
        total_votes = COALESCE(total_votes, 0) + 1
      WHERE id = p_kol_id;
    END IF;
  END IF;

  -- Return updated KOL data with upvotes and downvotes
  SELECT json_build_object(
    'success', true,
    'rating', rating,
    'total_votes', total_votes,
    'upvotes', upvotes,
    'downvotes', downvotes
  ) INTO v_result
  FROM public.kols WHERE id = p_kol_id;
  
  RETURN v_result;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: app_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.app_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key text NOT NULL,
    value text NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by text
);


--
-- Name: bounties; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bounties (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    reward text NOT NULL,
    wallet_address text NOT NULL,
    status text DEFAULT 'open'::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    image_url text,
    expires_at timestamp with time zone,
    tx_signature text,
    winner_wallet text,
    CONSTRAINT bounties_status_check CHECK ((status = ANY (ARRAY['open'::text, 'in_review'::text, 'completed'::text, 'expired'::text, 'cancelled'::text])))
);


--
-- Name: bounty_submissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bounty_submissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    bounty_id uuid NOT NULL,
    wallet_address text NOT NULL,
    content text NOT NULL,
    proof_url text,
    status text DEFAULT 'pending'::text NOT NULL,
    creator_feedback text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT bounty_submissions_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'changes_requested'::text])))
);


--
-- Name: comment_votes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.comment_votes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    comment_id uuid NOT NULL,
    wallet_address text NOT NULL,
    vote_type text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT comment_votes_vote_type_check CHECK ((vote_type = ANY (ARRAY['like'::text, 'dislike'::text])))
);


--
-- Name: friend_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.friend_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sender_wallet text NOT NULL,
    receiver_wallet text NOT NULL,
    content text NOT NULL,
    is_read boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.friend_messages REPLICA IDENTITY FULL;


--
-- Name: friend_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.friend_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    requester_wallet text NOT NULL,
    requested_wallet text NOT NULL,
    status public.friend_request_status DEFAULT 'pending'::public.friend_request_status NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    responded_at timestamp with time zone,
    CONSTRAINT friend_requests_not_self CHECK ((requester_wallet <> requested_wallet))
);

ALTER TABLE ONLY public.friend_requests REPLICA IDENTITY FULL;


--
-- Name: kol_comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.kol_comments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    kol_id uuid NOT NULL,
    wallet_address text NOT NULL,
    content text NOT NULL,
    rating integer,
    image_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    trade_signature text,
    parent_comment_id uuid,
    CONSTRAINT kol_comments_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


--
-- Name: kol_pnl_snapshots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.kol_pnl_snapshots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    kol_id uuid NOT NULL,
    wallet_address text NOT NULL,
    month_year text NOT NULL,
    pnl_sol numeric DEFAULT 0,
    pnl_usd numeric DEFAULT 0,
    win_count integer DEFAULT 0,
    loss_count integer DEFAULT 0,
    total_trades integer DEFAULT 0,
    win_rate numeric DEFAULT 0,
    fetched_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: kol_votes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.kol_votes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    kol_id uuid NOT NULL,
    wallet_address text NOT NULL,
    vote_type text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    last_vote_at timestamp with time zone DEFAULT now(),
    CONSTRAINT kol_votes_vote_type_check CHECK ((vote_type = ANY (ARRAY['up'::text, 'down'::text])))
);


--
-- Name: kols; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.kols (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    username text NOT NULL,
    twitter_handle text NOT NULL,
    profile_pic_url text,
    wallet_address text,
    rating numeric DEFAULT 0,
    total_votes integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    categories text[] DEFAULT '{}'::text[],
    is_wallet_verified boolean DEFAULT false,
    upvotes integer DEFAULT 0,
    downvotes integer DEFAULT 0
);


--
-- Name: user_friends; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_friends (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_wallet text NOT NULL,
    friend_wallet text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    wallet_address text NOT NULL,
    display_name text,
    profile_pic_url text,
    has_changed_name boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_verified boolean DEFAULT false,
    is_profile_public boolean DEFAULT true,
    worn_badge text,
    auth_user_id uuid
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    wallet_address text NOT NULL,
    role public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: wallet_verifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wallet_verifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    kol_id uuid NOT NULL,
    wallet_address text NOT NULL,
    verified_at timestamp with time zone DEFAULT now() NOT NULL,
    signature text NOT NULL,
    message text NOT NULL,
    verified_by_wallet text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: app_settings app_settings_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_settings
    ADD CONSTRAINT app_settings_key_key UNIQUE (key);


--
-- Name: app_settings app_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_settings
    ADD CONSTRAINT app_settings_pkey PRIMARY KEY (id);


--
-- Name: bounties bounties_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bounties
    ADD CONSTRAINT bounties_pkey PRIMARY KEY (id);


--
-- Name: bounty_submissions bounty_submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bounty_submissions
    ADD CONSTRAINT bounty_submissions_pkey PRIMARY KEY (id);


--
-- Name: comment_votes comment_votes_comment_id_wallet_address_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comment_votes
    ADD CONSTRAINT comment_votes_comment_id_wallet_address_key UNIQUE (comment_id, wallet_address);


--
-- Name: comment_votes comment_votes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comment_votes
    ADD CONSTRAINT comment_votes_pkey PRIMARY KEY (id);


--
-- Name: friend_messages friend_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.friend_messages
    ADD CONSTRAINT friend_messages_pkey PRIMARY KEY (id);


--
-- Name: friend_requests friend_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.friend_requests
    ADD CONSTRAINT friend_requests_pkey PRIMARY KEY (id);


--
-- Name: friend_requests friend_requests_unique_pair; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.friend_requests
    ADD CONSTRAINT friend_requests_unique_pair UNIQUE (requester_wallet, requested_wallet);


--
-- Name: kol_comments kol_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kol_comments
    ADD CONSTRAINT kol_comments_pkey PRIMARY KEY (id);


--
-- Name: kol_pnl_snapshots kol_pnl_snapshots_kol_id_month_year_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kol_pnl_snapshots
    ADD CONSTRAINT kol_pnl_snapshots_kol_id_month_year_key UNIQUE (kol_id, month_year);


--
-- Name: kol_pnl_snapshots kol_pnl_snapshots_kol_id_month_year_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kol_pnl_snapshots
    ADD CONSTRAINT kol_pnl_snapshots_kol_id_month_year_unique UNIQUE (kol_id, month_year);


--
-- Name: kol_pnl_snapshots kol_pnl_snapshots_kol_id_wallet_address_month_year_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kol_pnl_snapshots
    ADD CONSTRAINT kol_pnl_snapshots_kol_id_wallet_address_month_year_key UNIQUE (kol_id, wallet_address, month_year);


--
-- Name: kol_pnl_snapshots kol_pnl_snapshots_kol_month_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kol_pnl_snapshots
    ADD CONSTRAINT kol_pnl_snapshots_kol_month_unique UNIQUE (kol_id, month_year);


--
-- Name: kol_pnl_snapshots kol_pnl_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kol_pnl_snapshots
    ADD CONSTRAINT kol_pnl_snapshots_pkey PRIMARY KEY (id);


--
-- Name: kol_votes kol_votes_kol_id_wallet_address_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kol_votes
    ADD CONSTRAINT kol_votes_kol_id_wallet_address_key UNIQUE (kol_id, wallet_address);


--
-- Name: kol_votes kol_votes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kol_votes
    ADD CONSTRAINT kol_votes_pkey PRIMARY KEY (id);


--
-- Name: kols kols_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kols
    ADD CONSTRAINT kols_pkey PRIMARY KEY (id);


--
-- Name: user_friends user_friends_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_friends
    ADD CONSTRAINT user_friends_pkey PRIMARY KEY (id);


--
-- Name: user_friends user_friends_user_wallet_friend_wallet_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_friends
    ADD CONSTRAINT user_friends_user_wallet_friend_wallet_key UNIQUE (user_wallet, friend_wallet);


--
-- Name: user_profiles user_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_pkey PRIMARY KEY (id);


--
-- Name: user_profiles user_profiles_wallet_address_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_wallet_address_key UNIQUE (wallet_address);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_wallet_address_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_wallet_address_role_key UNIQUE (wallet_address, role);


--
-- Name: wallet_verifications wallet_verifications_kol_id_wallet_address_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_verifications
    ADD CONSTRAINT wallet_verifications_kol_id_wallet_address_key UNIQUE (kol_id, wallet_address);


--
-- Name: wallet_verifications wallet_verifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_verifications
    ADD CONSTRAINT wallet_verifications_pkey PRIMARY KEY (id);


--
-- Name: idx_comment_votes_comment_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_comment_votes_comment_id ON public.comment_votes USING btree (comment_id);


--
-- Name: idx_comment_votes_wallet; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_comment_votes_wallet ON public.comment_votes USING btree (wallet_address);


--
-- Name: idx_friend_messages_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_friend_messages_created ON public.friend_messages USING btree (created_at DESC);


--
-- Name: idx_friend_messages_receiver; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_friend_messages_receiver ON public.friend_messages USING btree (receiver_wallet);


--
-- Name: idx_friend_messages_sender; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_friend_messages_sender ON public.friend_messages USING btree (sender_wallet);


--
-- Name: idx_kol_comments_parent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kol_comments_parent ON public.kol_comments USING btree (parent_comment_id) WHERE (parent_comment_id IS NOT NULL);


--
-- Name: idx_kols_categories; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kols_categories ON public.kols USING gin (categories);


--
-- Name: idx_user_friends_friend_wallet; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_friends_friend_wallet ON public.user_friends USING btree (friend_wallet);


--
-- Name: idx_user_friends_user_wallet; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_friends_user_wallet ON public.user_friends USING btree (user_wallet);


--
-- Name: user_profiles_auth_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX user_profiles_auth_user_id_idx ON public.user_profiles USING btree (auth_user_id);


--
-- Name: user_profiles_wallet_address_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX user_profiles_wallet_address_idx ON public.user_profiles USING btree (wallet_address);


--
-- Name: app_settings update_app_settings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_app_settings_updated_at BEFORE UPDATE ON public.app_settings FOR EACH ROW EXECUTE FUNCTION public.update_app_settings_updated_at();


--
-- Name: bounty_submissions update_bounty_submissions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_bounty_submissions_updated_at BEFORE UPDATE ON public.bounty_submissions FOR EACH ROW EXECUTE FUNCTION public.update_user_profiles_updated_at();


--
-- Name: kol_pnl_snapshots update_kol_pnl_snapshots_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_kol_pnl_snapshots_updated_at BEFORE UPDATE ON public.kol_pnl_snapshots FOR EACH ROW EXECUTE FUNCTION public.update_pnl_snapshot_updated_at();


--
-- Name: kol_comments update_kol_rating_on_comment; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_kol_rating_on_comment AFTER INSERT ON public.kol_comments FOR EACH ROW EXECUTE FUNCTION public.update_kol_rating_from_comment();


--
-- Name: user_profiles update_user_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON public.user_profiles FOR EACH ROW EXECUTE FUNCTION public.update_user_profiles_updated_at();


--
-- Name: bounty_submissions bounty_submissions_bounty_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bounty_submissions
    ADD CONSTRAINT bounty_submissions_bounty_id_fkey FOREIGN KEY (bounty_id) REFERENCES public.bounties(id) ON DELETE CASCADE;


--
-- Name: comment_votes comment_votes_comment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comment_votes
    ADD CONSTRAINT comment_votes_comment_id_fkey FOREIGN KEY (comment_id) REFERENCES public.kol_comments(id) ON DELETE CASCADE;


--
-- Name: kol_comments kol_comments_kol_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kol_comments
    ADD CONSTRAINT kol_comments_kol_id_fkey FOREIGN KEY (kol_id) REFERENCES public.kols(id) ON DELETE CASCADE;


--
-- Name: kol_comments kol_comments_parent_comment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kol_comments
    ADD CONSTRAINT kol_comments_parent_comment_id_fkey FOREIGN KEY (parent_comment_id) REFERENCES public.kol_comments(id) ON DELETE CASCADE;


--
-- Name: kol_pnl_snapshots kol_pnl_snapshots_kol_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kol_pnl_snapshots
    ADD CONSTRAINT kol_pnl_snapshots_kol_id_fkey FOREIGN KEY (kol_id) REFERENCES public.kols(id) ON DELETE CASCADE;


--
-- Name: kol_votes kol_votes_kol_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kol_votes
    ADD CONSTRAINT kol_votes_kol_id_fkey FOREIGN KEY (kol_id) REFERENCES public.kols(id) ON DELETE CASCADE;


--
-- Name: user_profiles user_profiles_auth_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_auth_user_id_fkey FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: wallet_verifications wallet_verifications_kol_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_verifications
    ADD CONSTRAINT wallet_verifications_kol_id_fkey FOREIGN KEY (kol_id) REFERENCES public.kols(id) ON DELETE CASCADE;


--
-- Name: kol_comments Anyone can insert comments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert comments" ON public.kol_comments FOR INSERT WITH CHECK (true);


--
-- Name: kols Anyone can insert kols; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert kols" ON public.kols FOR INSERT WITH CHECK (true);


--
-- Name: kol_pnl_snapshots Anyone can read PNL snapshots; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read PNL snapshots" ON public.kol_pnl_snapshots FOR SELECT USING (true);


--
-- Name: app_settings Anyone can read app settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read app settings" ON public.app_settings FOR SELECT USING (true);


--
-- Name: bounties Anyone can read bounties; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read bounties" ON public.bounties FOR SELECT USING (true);


--
-- Name: comment_votes Anyone can read comment votes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read comment votes" ON public.comment_votes FOR SELECT USING (true);


--
-- Name: kol_comments Anyone can read comments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read comments" ON public.kol_comments FOR SELECT USING (true);


--
-- Name: user_friends Anyone can read friends; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read friends" ON public.user_friends FOR SELECT USING (true);


--
-- Name: kols Anyone can read kols; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read kols" ON public.kols FOR SELECT USING (true);


--
-- Name: bounty_submissions Anyone can read submissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read submissions" ON public.bounty_submissions FOR SELECT USING (true);


--
-- Name: user_profiles Anyone can read user profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read user profiles" ON public.user_profiles FOR SELECT USING (true);


--
-- Name: user_roles Anyone can read user roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read user roles" ON public.user_roles FOR SELECT USING (true);


--
-- Name: kol_votes Anyone can read votes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read votes" ON public.kol_votes FOR SELECT USING (true);


--
-- Name: wallet_verifications Anyone can read wallet verifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read wallet verifications" ON public.wallet_verifications FOR SELECT USING (true);


--
-- Name: kol_votes Anyone can vote; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can vote" ON public.kol_votes FOR INSERT WITH CHECK (true);


--
-- Name: user_friends Authenticated users can add friends; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can add friends" ON public.user_friends FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.user_profiles
  WHERE ((user_profiles.wallet_address = user_friends.user_wallet) AND (user_profiles.auth_user_id = auth.uid())))));


--
-- Name: bounties Authenticated users can insert bounties; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can insert bounties" ON public.bounties FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.user_profiles
  WHERE ((user_profiles.wallet_address = bounties.wallet_address) AND (user_profiles.auth_user_id = auth.uid())))));


--
-- Name: user_profiles Authenticated users can insert own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can insert own profile" ON public.user_profiles FOR INSERT WITH CHECK (((auth.uid() IS NOT NULL) AND (auth.uid() = auth_user_id)));


--
-- Name: wallet_verifications Authenticated users can insert wallet verifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can insert wallet verifications" ON public.wallet_verifications FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.user_profiles
  WHERE ((user_profiles.wallet_address = wallet_verifications.verified_by_wallet) AND (user_profiles.auth_user_id = auth.uid())))));


--
-- Name: bounty_submissions Authenticated users can submit to bounties; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can submit to bounties" ON public.bounty_submissions FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.user_profiles
  WHERE ((user_profiles.wallet_address = bounty_submissions.wallet_address) AND (user_profiles.auth_user_id = auth.uid())))));


--
-- Name: comment_votes Authenticated users can vote on comments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can vote on comments" ON public.comment_votes FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.user_profiles
  WHERE ((user_profiles.wallet_address = comment_votes.wallet_address) AND (user_profiles.auth_user_id = auth.uid())))));


--
-- Name: bounty_submissions Bounty creator can update submissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Bounty creator can update submissions" ON public.bounty_submissions FOR UPDATE USING (((EXISTS ( SELECT 1
   FROM public.bounties
  WHERE ((bounties.id = bounty_submissions.bounty_id) AND (bounties.wallet_address = bounty_submissions.wallet_address)))) OR (wallet_address = ( SELECT bounties.wallet_address
   FROM public.bounties
  WHERE (bounties.id = bounty_submissions.bounty_id))))) WITH CHECK (true);


--
-- Name: bounties Deny all updates on bounties; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Deny all updates on bounties" ON public.bounties FOR UPDATE USING (false);


--
-- Name: bounties Deny direct bounty deletes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Deny direct bounty deletes" ON public.bounties FOR DELETE USING (false);


--
-- Name: kol_comments Deny direct comment deletes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Deny direct comment deletes" ON public.kol_comments FOR DELETE USING (false);


--
-- Name: user_friends Deny direct friend deletes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Deny direct friend deletes" ON public.user_friends FOR DELETE USING (false);


--
-- Name: kols Deny direct kol deletes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Deny direct kol deletes" ON public.kols FOR DELETE USING (false);


--
-- Name: kol_pnl_snapshots Deny direct pnl snapshot deletes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Deny direct pnl snapshot deletes" ON public.kol_pnl_snapshots FOR DELETE USING (false);


--
-- Name: bounty_submissions Deny direct submission deletes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Deny direct submission deletes" ON public.bounty_submissions FOR DELETE USING (false);


--
-- Name: wallet_verifications Deny direct verification deletes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Deny direct verification deletes" ON public.wallet_verifications FOR DELETE USING (false);


--
-- Name: kol_votes Deny direct vote deletes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Deny direct vote deletes" ON public.kol_votes FOR DELETE USING (false);


--
-- Name: kol_votes Deny direct vote updates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Deny direct vote updates" ON public.kol_votes FOR UPDATE USING (false);


--
-- Name: user_roles Only admins can delete roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can delete roles" ON public.user_roles FOR DELETE USING (public.has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'wallet_address'::text), 'admin'::public.app_role));


--
-- Name: app_settings Only admins can insert app settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can insert app settings" ON public.app_settings FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.wallet_address = ((current_setting('request.jwt.claims'::text, true))::json ->> 'wallet_address'::text)) AND (user_roles.role = 'admin'::public.app_role)))));


--
-- Name: user_roles Only admins can insert roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can insert roles" ON public.user_roles FOR INSERT WITH CHECK (public.has_role(((current_setting('request.jwt.claims'::text, true))::json ->> 'wallet_address'::text), 'admin'::public.app_role));


--
-- Name: app_settings Only admins can update app settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can update app settings" ON public.app_settings FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.wallet_address = ((current_setting('request.jwt.claims'::text, true))::json ->> 'wallet_address'::text)) AND (user_roles.role = 'admin'::public.app_role)))));


--
-- Name: kols Only admins can update kols directly; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can update kols directly" ON public.kols FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.wallet_address = ((current_setting('request.jwt.claims'::text, true))::json ->> 'wallet_address'::text)) AND (user_roles.role = 'admin'::public.app_role)))));


--
-- Name: friend_requests Requested user can respond to friend requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Requested user can respond to friend requests" ON public.friend_requests FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.user_profiles up
  WHERE ((up.auth_user_id = auth.uid()) AND (up.wallet_address = friend_requests.requested_wallet))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.user_profiles up
  WHERE ((up.auth_user_id = auth.uid()) AND (up.wallet_address = friend_requests.requested_wallet)))));


--
-- Name: kol_pnl_snapshots Service role can insert PNL snapshots; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can insert PNL snapshots" ON public.kol_pnl_snapshots FOR INSERT WITH CHECK (((current_setting('role'::text, true) = 'service_role'::text) OR (EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.wallet_address = ((current_setting('request.jwt.claims'::text, true))::json ->> 'wallet_address'::text)) AND (user_roles.role = 'admin'::public.app_role))))));


--
-- Name: kol_pnl_snapshots Service role can update PNL snapshots; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can update PNL snapshots" ON public.kol_pnl_snapshots FOR UPDATE USING (((current_setting('role'::text, true) = 'service_role'::text) OR (EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.wallet_address = ((current_setting('request.jwt.claims'::text, true))::json ->> 'wallet_address'::text)) AND (user_roles.role = 'admin'::public.app_role))))));


--
-- Name: friend_requests Users can create friend requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create friend requests" ON public.friend_requests FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.user_profiles up
  WHERE ((up.auth_user_id = auth.uid()) AND (up.wallet_address = friend_requests.requester_wallet)))));


--
-- Name: comment_votes Users can delete their own votes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own votes" ON public.comment_votes FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.user_profiles
  WHERE ((user_profiles.wallet_address = comment_votes.wallet_address) AND (user_profiles.auth_user_id = auth.uid())))));


--
-- Name: friend_messages Users can mark messages as read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can mark messages as read" ON public.friend_messages FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.user_profiles
  WHERE ((user_profiles.wallet_address = friend_messages.receiver_wallet) AND (user_profiles.auth_user_id = auth.uid())))));


--
-- Name: friend_requests Users can read their own friend requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read their own friend requests" ON public.friend_requests FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.user_profiles up
  WHERE ((up.auth_user_id = auth.uid()) AND ((up.wallet_address = friend_requests.requester_wallet) OR (up.wallet_address = friend_requests.requested_wallet))))));


--
-- Name: friend_messages Users can read their own messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read their own messages" ON public.friend_messages FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.user_profiles
  WHERE ((user_profiles.auth_user_id = auth.uid()) AND ((user_profiles.wallet_address = friend_messages.sender_wallet) OR (user_profiles.wallet_address = friend_messages.receiver_wallet))))));


--
-- Name: friend_messages Users can send messages to friends; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can send messages to friends" ON public.friend_messages FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM public.user_profiles up
  WHERE ((up.auth_user_id = auth.uid()) AND (up.wallet_address = friend_messages.sender_wallet)))) AND ((EXISTS ( SELECT 1
   FROM public.user_friends uf
  WHERE ((uf.user_wallet = friend_messages.sender_wallet) AND (uf.friend_wallet = friend_messages.receiver_wallet)))) OR (EXISTS ( SELECT 1
   FROM public.user_friends uf
  WHERE ((uf.user_wallet = friend_messages.receiver_wallet) AND (uf.friend_wallet = friend_messages.sender_wallet)))))));


--
-- Name: user_profiles Users can update their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own profile" ON public.user_profiles FOR UPDATE USING (((auth.uid() IS NOT NULL) AND (auth.uid() = auth_user_id))) WITH CHECK (((auth.uid() IS NOT NULL) AND (auth.uid() = auth_user_id)));


--
-- Name: comment_votes Users can update their own votes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own votes" ON public.comment_votes FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.user_profiles
  WHERE ((user_profiles.wallet_address = comment_votes.wallet_address) AND (user_profiles.auth_user_id = auth.uid())))));


--
-- Name: app_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: bounties; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bounties ENABLE ROW LEVEL SECURITY;

--
-- Name: bounty_submissions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bounty_submissions ENABLE ROW LEVEL SECURITY;

--
-- Name: comment_votes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.comment_votes ENABLE ROW LEVEL SECURITY;

--
-- Name: friend_messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.friend_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: friend_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: kol_comments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.kol_comments ENABLE ROW LEVEL SECURITY;

--
-- Name: kol_pnl_snapshots; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.kol_pnl_snapshots ENABLE ROW LEVEL SECURITY;

--
-- Name: kol_votes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.kol_votes ENABLE ROW LEVEL SECURITY;

--
-- Name: kols; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.kols ENABLE ROW LEVEL SECURITY;

--
-- Name: user_friends; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_friends ENABLE ROW LEVEL SECURITY;

--
-- Name: user_profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: wallet_verifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.wallet_verifications ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--




COMMIT;