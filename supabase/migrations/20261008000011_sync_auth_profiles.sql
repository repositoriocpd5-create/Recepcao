-- Cria e sincroniza perfis internos a partir dos usuários do Supabase Auth.
-- A senha continua exclusivamente em auth.users; nunca é copiada para public.profiles.
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role public.user_role;
BEGIN
  v_role := CASE
    WHEN NEW.email = 'cpdinfra@edu.itaguai.rj.gov.br' THEN 'admin'::public.user_role
    ELSE COALESCE((NEW.raw_user_meta_data ->> 'role')::public.user_role, 'recepcionista'::public.user_role)
  END;

  INSERT INTO public.profiles (id, email, nome_completo, cargo, role, ativo)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'nome_completo', ''), split_part(NEW.email, '@', 1)),
    CASE WHEN v_role = 'admin' THEN 'Administrador' ELSE 'Recepcionista' END,
    v_role,
    true
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      nome_completo = EXCLUDED.nome_completo,
      cargo = EXCLUDED.cargo,
      role = EXCLUDED.role,
      ativo = true,
      updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- Sincroniza os usuários já criados no Authentication.
INSERT INTO public.profiles (id, email, nome_completo, cargo, role, ativo)
SELECT
  id,
  email,
  COALESCE(NULLIF(raw_user_meta_data ->> 'nome_completo', ''), split_part(email, '@', 1)),
  CASE WHEN email = 'cpdinfra@edu.itaguai.rj.gov.br' THEN 'Administrador' ELSE 'Recepcionista' END,
  CASE WHEN email = 'cpdinfra@edu.itaguai.rj.gov.br' THEN 'admin'::public.user_role ELSE 'recepcionista'::public.user_role END,
  true
FROM auth.users
ON CONFLICT (id) DO UPDATE
SET email = EXCLUDED.email,
    nome_completo = EXCLUDED.nome_completo,
    cargo = EXCLUDED.cargo,
    role = EXCLUDED.role,
    ativo = true,
    updated_at = now();
