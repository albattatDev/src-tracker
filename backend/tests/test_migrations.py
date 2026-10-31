from alembic import command


def test_migration_matches_models(engine, alembic_cfg):
    """Fails if a model changed without a matching migration (`engine` has already
    upgraded srct_test to head)."""
    command.check(alembic_cfg)
