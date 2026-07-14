DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'Usuario'
      AND column_name = 'password'
  ) THEN
    ALTER TABLE "Usuario" RENAME COLUMN "password" TO "password_hash";
  END IF;
END $$;
