import { ConditionsLimit, ModuleCategory } from "../constants";
import { registerRule, RuleType } from "../modules/rules";
import { hookFunction } from "../patching";

export function initRules_bc_relation_control() {
	registerRule("rc_club_owner", {
		name: "Запретить смену владельца клуба",
		type: RuleType.RC,
		shortDescription: "получение или выход из владельца",
		longDescription: "Это правило запрещает PLAYER_NAME покинуть нынешнего владельца клуба или приобрести нового. Переход от пробного владения к полному не затрагивается. Это не мешает владельцу клуба освободить ее.",
		keywords: ["prevent", "ownership", "collaring", "break"],
		// Logs are not implemented
		loggable: false,
		// triggerTexts: {
		// 	infoBeep: "You are not allowed to [leave your|get an] owner!",
		// 	attempt_log: "PLAYER_NAME tried to [leave their|get an] owner, which was forbidden.",
		// 	log: "PLAYER_NAME [left their|got an] owner, which was forbidden."
		// },
		defaultLimit: ConditionsLimit.blocked,
		load(state) {
			hookFunction("ChatRoomOwnershipOptionIs", 5, (args, next) => {
				const Option = args[0] as string;
				if (state.isEnforced && Option === "CanStartTrial")
					return false;
				return next(args);
			}, ModuleCategory.Rules);
			for (const fun of [
				"ManagementCanBeReleasedOnline",
				"ManagementCanBreakTrialOnline",
				"ManagementCannotBeReleasedOnline",
				"ManagementCanBeReleased",
				"ManagementCannotBeReleased",
			] as const) {
				hookFunction(fun, 5, (args, next) => {
					return !state.isEnforced && next(args);
				}, ModuleCategory.Rules);
			}
			hookFunction("ManagementCannotBeReleasedExtreme", 5, (args, next) => {
				return state.isEnforced || next(args);
			}, ModuleCategory.Rules);
		},
	});

	registerRule("rc_lover_new", {
		name: "Запретить заводить новых любовников",
		type: RuleType.RC,
		longDescription: "Это правило запрещает PLAYER_NAME чтобы завести нового любовника. Развитие любовных отношений от свидания к помолвке или от помолвки к браку не затрагивается.",
		keywords: ["prevent", "lovership", "dating"],
		// Logs are not implemented
		loggable: false,
		// triggerTexts: {
		// 	infoBeep: "Due to a rule, you are not allowed to get a new lover!",
		// 	attempt_log: "PLAYER_NAME tried to get a new lover, TARGET_PLAYER, which was forbidden",
		// 	log: "PLAYER_NAME got a new lover, TARGET_PLAYER, which was forbidden"
		// },
		defaultLimit: ConditionsLimit.blocked,
		load(state) {
			hookFunction("ChatRoomLovershipOptionIs", 5, (args, next) => {
				const Option = args[0] as string;
				if (state.isEnforced && (Option === "CanOfferBeginDating" || Option === "CanBeginDating"))
					return false;
				return next(args);
			}, ModuleCategory.Rules);
		},
	});

	registerRule("rc_lover_leave", {
		name: "Запретить расставание с любовниками",
		type: RuleType.RC,
		longDescription: "Это правило запрещает PLAYER_NAME оставлять любого из своих возлюбленных, независимо от стадии любовных отношений (запрещено оставлять встречающихся, помолвленных и женатых персонажей). Не мешает любовникам расстаться с ней.",
		keywords: ["prevent", "lovership", "dating", "leave", "leaving"],
		// Logs are not implemented
		loggable: false,
		// triggerTexts: {
		// 	infoBeep: "Due to a rule, you are not allowed to leave your lover!",
		// 	attempt_log: "PLAYER_NAME tried to leave their lover, TARGET_PLAYER, which was forbidden",
		// 	log: "PLAYER_NAME left their lover, TARGET_PLAYER, which was forbidden"
		// },
		defaultLimit: ConditionsLimit.blocked,
		load(state) {
			for (const fun of [
				"ManagementCanBreakDatingLoverOnline",
				"ManagementCanBreakUpLoverOnline",
			] as const) {
				hookFunction(fun, 5, (args, next) => {
					return !state.isEnforced && next(args);
				}, ModuleCategory.Rules);
			}
		},
	});

	registerRule("rc_sub_new", {
		name: "Запретить брать новых сабмиссивов",
		type: RuleType.RC,
		shortDescription: "предложив им попробовать право собственности",
		longDescription: "Это правило запрещает PLAYER_NAME начать испытание с новым сабмиссивом. Переход от пробного владения к полному не затрагивается.",
		keywords: ["prevent", "subbies", "collaring"],
		// Logs are not implemented
		loggable: false,
		// triggerTexts: {
		// 	infoBeep: "Due to a rule, you are not allowed to own a new submissive!",
		// 	attempt_log: "PLAYER_NAME tried to collar a new sub, TARGET_PLAYER, which was forbidden",
		// 	log: "PLAYER_NAME collared a new sub, TARGET_PLAYER, which was forbidden"
		// },
		defaultLimit: ConditionsLimit.blocked,
		load(state) {
			hookFunction("ChatRoomOwnershipOptionIs", 5, (args, next) => {
				const Option = args[0] as string;
				if (state.isEnforced && Option === "Propose")
					return false;
				return next(args);
			}, ModuleCategory.Rules);
		},
	});

	registerRule("rc_sub_leave", {
		name: "Запретить отрекаться от сабмиссивов",
		type: RuleType.RC,
		longDescription: "Это правило запрещает PLAYER_NAME отпустить любого из своих подчиненных. (влияет как на пробное, так и на полное владение). Это не мешает ее подчиненным разорвать связь.",
		keywords: ["prevent", "subbies", "collar", "freeing", "releasing", "release"],
		// Logs are not implemented
		loggable: false,
		// triggerTexts: {
		// 	infoBeep: "Due to a rule, you are not allowed to let go of any of your submissive!",
		// 	attempt_log: "PLAYER_NAME tried to let go of their sub, TARGET_PLAYER, which was forbidden",
		// 	log: "PLAYER_NAME let go of their sub, TARGET_PLAYER, which was forbidden"
		// },
		defaultLimit: ConditionsLimit.blocked,
		load(state) {
			hookFunction("ChatRoomIsOwnedByPlayer", 5, (args, next) => {
				return !state.isEnforced && next(args);
			}, ModuleCategory.Rules);
		},
	});
}
