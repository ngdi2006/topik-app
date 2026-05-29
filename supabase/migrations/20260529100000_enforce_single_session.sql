-- Create a function to enforce single session per user
create or replace function public.enforce_single_session()
returns trigger as $$
begin
  -- Delete all other sessions for this user except the newly created one
  delete from auth.sessions
  where user_id = NEW.user_id
  and id != NEW.id;
  
  return NEW;
end;
$$ language plpgsql security definer;

-- Drop the trigger if it already exists
drop trigger if exists on_auth_session_created on auth.sessions;

-- Create the trigger to run after a new session is inserted
create trigger on_auth_session_created
  after insert on auth.sessions
  for each row execute procedure public.enforce_single_session();
