.PHONY: build-BuddyTalkApi

build-BuddyTalkApi:
	pip install -r requirements.txt -t "$(ARTIFACTS_DIR)" --upgrade --platform manylinux2014_x86_64 --implementation cp --python-version 3.12 --only-binary=:all: 2>/dev/null || pip install -r requirements.txt -t "$(ARTIFACTS_DIR)" --upgrade
	cp -r src "$(ARTIFACTS_DIR)/"
	mkdir -p "$(ARTIFACTS_DIR)/assets/friends" "$(ARTIFACTS_DIR)/assets/buddies"
	@for dir in ../assets/friends/*/; do \
		[ -d "$$dir" ] || continue; \
		id=$$(basename "$$dir"); \
		mkdir -p "$(ARTIFACTS_DIR)/assets/friends/$$id"; \
		[ -f "$$dir/persona.yaml" ] && cp "$$dir/persona.yaml" "$(ARTIFACTS_DIR)/assets/friends/$$id/"; \
		[ -f "$$dir/reference.png" ] && cp "$$dir/reference.png" "$(ARTIFACTS_DIR)/assets/friends/$$id/"; \
	done
	@for dir in ../assets/buddies/*/; do \
		[ -d "$$dir" ] || continue; \
		id=$$(basename "$$dir"); \
		mkdir -p "$(ARTIFACTS_DIR)/assets/buddies/$$id"; \
		[ -f "$$dir/persona.yaml" ] && cp "$$dir/persona.yaml" "$(ARTIFACTS_DIR)/assets/buddies/$$id/"; \
		[ -f "$$dir/reference.png" ] && cp "$$dir/reference.png" "$(ARTIFACTS_DIR)/assets/buddies/$$id/"; \
	done
