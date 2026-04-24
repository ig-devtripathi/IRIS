import fuzzy_engine

cs = fuzzy_engine.build_system('pure')
rules_list = list(cs.rules)  # Convert to list
print(f"Pure mode rule count: {len(rules_list)}")

cs_ai = fuzzy_engine.build_system('ai')
rules_list_ai = list(cs_ai.rules)
print(f"AI mode rule count: {len(rules_list_ai)}")

# Print rule details for pure
print("\nPure mode rules:")
for i, r in enumerate(rules_list):
    print(f"  {i}: {r}")
