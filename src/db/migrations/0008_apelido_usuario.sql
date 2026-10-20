-- Como a pessoa quer ser chamada no sistema (saudação), separado do nome completo.
ALTER TABLE core_users ADD COLUMN IF NOT EXISTS nickname varchar(60);
