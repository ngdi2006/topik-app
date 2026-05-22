create or replace function public.deduct_user_credits(
    p_user_id uuid,
    p_credits int
)
returns public.user_exam_credits
language plpgsql
security definer
as $$
declare
    v_row public.user_exam_credits;
begin
    if p_credits is null or p_credits <= 0 then
        raise exception 'Credits to deduct must be a positive integer';
    end if;

    insert into public.user_exam_credits (user_id, total_credits, used_credits)
    values (p_user_id, 0, 0)
    on conflict (user_id) do nothing;

    update public.user_exam_credits
    set used_credits = used_credits + p_credits,
        updated_at = now()
    where user_id = p_user_id
      and remaining_credits >= p_credits
    returning * into v_row;

    if not found then
        raise exception 'Insufficient remaining credits or credit row not found';
    end if;

    return v_row;
end;
$$;

grant execute on function public.deduct_user_credits(uuid, int) to authenticated;
