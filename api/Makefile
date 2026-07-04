.PHONY: build-BuddyTalkApi

build-BuddyTalkApi:
	python3 -m pip install -r requirements.txt -t "$(ARTIFACTS_DIR)" --upgrade
	cp -r src "$(ARTIFACTS_DIR)/"
	mkdir -p "$(ARTIFACTS_DIR)/assets"
	cp -r ../assets/friends "$(ARTIFACTS_DIR)/assets/"
	cp -r ../assets/buddies "$(ARTIFACTS_DIR)/assets/"
