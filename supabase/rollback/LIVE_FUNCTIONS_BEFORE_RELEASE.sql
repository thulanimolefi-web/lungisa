-- Copy of live definitions read from production on 20 Nov 2026 (read-only), before the security release.
-- The rollback file cannot recreate the two dropped functions or the replaced ones. Use these if needed.

create or replace function public.refresh_tradesperson_rating() returns trigger language plpgsql as $$
begin
  update public.tradesperson_profiles
  set rating_avg   = (select round(avg(rating)::numeric, 2) from public.reviews where reviewee_id = new.reviewee_id),
      rating_count = (select count(*) from public.reviews where reviewee_id = new.reviewee_id)
  where id = new.reviewee_id;
  return new;
end;
$$;
create trigger review_inserted after insert on public.reviews for each row execute function refresh_tradesperson_rating();

create or replace function public.notify_homeowner_on_bid() returns trigger language plpgsql as $$
BEGIN
  INSERT INTO public.notifications (user_id, type, payload)
  SELECT j.homeowner_id, 'new_bid',
    jsonb_build_object('job_id', NEW.job_id, 'job_title', j.title, 'bid_amount', NEW.amount, 'eta', NEW.eta_label, 'tradesperson_id', NEW.tradesperson_id)
  FROM public.jobs j WHERE j.id = NEW.job_id;
  RETURN NEW;
END;
$$;
-- (not attached to any trigger in production)

create trigger bid_inserted after insert on public.bids for each row execute function increment_bid_count();

create or replace function public.recalculate_tradesperson_rating() returns trigger language plpgsql as $$
DECLARE target_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN target_id := OLD.reviewee_id; ELSE target_id := NEW.reviewee_id; END IF;
  UPDATE public.tradesperson_profiles
  SET rating_avg   = ROUND((SELECT AVG(rating) FROM public.reviews WHERE reviewee_id = target_id)::numeric, 1),
      rating_count = (SELECT COUNT(*) FROM public.reviews WHERE reviewee_id = target_id)
  WHERE id = target_id;
  RETURN NEW;
END;
$$;
create trigger on_review_change after insert or delete or update on public.reviews for each row execute function recalculate_tradesperson_rating();

create or replace function public.assign_founding_member() returns trigger language plpgsql as $$
DECLARE current_count integer;
BEGIN
  SELECT COUNT(*) INTO current_count FROM public.tradesperson_profiles WHERE is_founding_member = true;
  IF current_count < 100 THEN NEW.is_founding_member := true; ELSE NEW.is_founding_member := false; END IF;
  RETURN NEW;
END;
$$;
