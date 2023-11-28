import { ConditionsLimit, ModuleCategory } from "../constants";
import { registerRule, RuleType } from "../modules/rules";
import { AccessLevel, getCharacterAccessLevel } from "../modules/authority";
import { registerSpeechHook, SpeechMessageInfo, falteringSpeech, SpeechHookAllow } from "../modules/speech";
import { callOriginal, hookFunction } from "../patching";
import { getChatroomCharacter } from "../characters";
import { dictionaryProcess, escapeRegExp, isObject } from "../utils";
import { ChatRoomSendLocal } from "../utilsClub";
import { BCX_setTimeout } from "../BCXContext";

function checkMessageForSounds(sounds: string[], message: string, allowPartialMatch: boolean = true): boolean {
	for (let sound of sounds) {
		sound = sound.toLocaleLowerCase();
		let ok = true;
		let i = -1;
		let fullMatch = allowPartialMatch;
		for (const c of message) {
			if (/\p{L}/igu.test(c)) {
				const nx = sound[(i + 1) % sound.length];
				if (c === nx) {
					i = (i + 1) % sound.length;
					if (i === sound.length - 1) {
						fullMatch = true;
					}
				} else if (c !== sound[i]) {
					ok = false;
					break;
				}
			}
		}
		if (ok && fullMatch)
			return true;
	}
	return false;
}

export function initRules_bc_speech_control() {
	registerRule("speech_specific_sound", {
		name: "Разрешить только определенные звуки",
		type: RuleType.Speech,
		shortDescription: "например, звук животного",
		longDescription: "Это правило позволяет PLAYER_NAME общаться только с использованием списка определенных звуковых шаблонов в сообщениях чата и шепотом. Однако эти шаблоны нельзя смешивать в одном сообщении. Для каждого сообщения допустим только один звук из списка. При этом любые вариации звука в списке разрешены при условии, что буквы расположены по порядку. (Пример: если установленный звук 'Meow', тогда это действительное сообщение: 'Me..ow? meeeow! mmeooowwwwwww?! meow. me.. oo..w ~')",
		keywords: ["filter", "speech", "talking", "letters"],
		triggerTexts: {
			infoBeep: "Вам разрешено говорить только одним из определенных звуков!",
			attempt_log: "PLAYER_NAME пытался нарушить правило говорить только с использованием определенных звуковых моделей",
			log: "PLAYER_NAME нарушил правило говорить только с использованием определенных звуковых моделей",
		},
		defaultLimit: ConditionsLimit.normal,
		dataDefinition: {
			soundWhitelist: {
				type: "stringList",
				default: [],
				description: "Установите разрешенные звуки:",
				options: {
					validate: /^\p{L}*$/iu,
				},
			},
		},
		init(state) {
			const check = (msg: SpeechMessageInfo): boolean => {
				const sounds = state.customData?.soundWhitelist;
				if (sounds && sounds.length > 0 && (msg.type === "Chat" || msg.type === "Whisper")) {
					const message = (msg.noOOCMessage ?? msg.originalMessage).toLocaleLowerCase();
					return checkMessageForSounds(sounds, message);
				}
				return true;
			};
			registerSpeechHook({
				allowSend: (msg) => {
					if (state.isEnforced && !check(msg)) {
						state.triggerAttempt();
						return SpeechHookAllow.BLOCK;
					}
					return SpeechHookAllow.ALLOW;
				},
				onSend: (msg) => {
					if (state.inEffect && !check(msg)) {
						state.trigger();
					}
				},
			});
		},
	});

	registerRule("speech_garble_whispers", {
		name: "Гэрбл шепчет с кляпом во рту",
		type: RuleType.Speech,
		loggable: false,
		shortDescription: "так же, как обычные сообщения",
		longDescription: "Это правило меняет PLAYER_NAME's исходящие сообщения шепотом, когда им затыкают рот, чтобы они были искажены так же, как и обычные сообщения чата. Это означает, что сила эффекта зависит от типа кляпа и (текст ООС) не затрагивается. Примечание. Пока правило действует, настройка погружения BC 'Предотвращать OOC и шепот при кляпе' изменена, чтобы разрешить шепот с кляпом во рту, поскольку теперь он искажается правилом. Предупреждение ООС не изменилось.",
		keywords: ["garbling", "whispering"],
		defaultLimit: ConditionsLimit.limited,
		init(state) {
			registerSpeechHook({
				modify: (info, message) => state.isEnforced && info.type === "Whisper" ? callOriginal("SpeechGarble", [Player, message, true]) : message,
			});
		},
		load(state) {
			hookFunction("ChatRoomShouldBlockGaggedOOCMessage", 2, (args, next) => {
				if (state.isEnforced && ChatRoomTargetMemberNumber !== null && !args[0].includes("(")) return false;
				return next(args);
			}, ModuleCategory.Rules);
		},
	});

	registerRule("speech_block_gagged_ooc", {
		name: "Блокировать OOC-чат, когда с кляпом во рту",
		type: RuleType.Speech,
		shortDescription: "больше не будет злоупотреблений ООС для обычного общения с кляпом во рту",
		longDescription: "Это правило запрещает PLAYER_NAME использовать OOC (сообщения в круглых скобках) в чате или сообщения OOC шепотом, пока ей затыкают рот.",
		keywords: ["parentheses", "prevent", "forbid"],
		triggerTexts: {
			infoBeep: "Вам не разрешается использовать OOC в сообщениях, когда вам затыкают рот.",
			attempt_log: "PLAYER_NAME пытался использовать ООС в сообщении с кляпом во рту",
			log: "PLAYER_NAME использовал OOC в сообщении с кляпом во рту",
		},
		defaultLimit: ConditionsLimit.blocked,
		init(state) {
			const check = (msg: SpeechMessageInfo): boolean => !msg.hasOOC || Player.CanTalk() || msg.type !== "Chat" && msg.type !== "Whisper";
			registerSpeechHook({
				allowSend: (msg) => {
					if (state.isEnforced && !check(msg)) {
						state.triggerAttempt();
						return SpeechHookAllow.BLOCK;
					}
					return SpeechHookAllow.ALLOW;
				},
				onSend: (msg) => {
					if (state.inEffect && !check(msg)) {
						state.trigger();
					}
				},
			});
		},
	});

	registerRule("speech_block_ooc", {
		name: "Заблокировать ООС-чат",
		type: RuleType.Speech,
		shortDescription: "блокирует использование OOC в сообщениях",
		longDescription: "Это правило запрещает PLAYER_NAME использовать OOC (сообщения в круглых скобках) в чате или OOC-сообщения шепотом в любой момент. Это крайнее правило, и его следует использовать с большой осторожностью!",
		keywords: ["parentheses", "prevent", "forbid"],
		triggerTexts: {
			infoBeep: "Вам запрещено использовать ООС в сообщениях!",
			attempt_log: "PLAYER_NAME пытался использовать OOC в сообщении",
			log: "PLAYER_NAME использовал OOC в сообщении",
		},
		defaultLimit: ConditionsLimit.blocked,
		init(state) {
			const check = (msg: SpeechMessageInfo): boolean => !msg.hasOOC || msg.type !== "Chat" && msg.type !== "Whisper";
			registerSpeechHook({
				allowSend: (msg) => {
					if (state.isEnforced && !check(msg)) {
						state.triggerAttempt();
						return SpeechHookAllow.BLOCK;
					}
					return SpeechHookAllow.ALLOW;
				},
				onSend: (msg) => {
					if (state.inEffect && !check(msg)) {
						state.trigger();
					}
				},
			});
		},
	});

	registerRule("speech_doll_talk", {
		name: "Кукольный разговор",
		type: RuleType.Speech,
		shortDescription: "позволяет составлять только короткие предложения с простыми словами",
		longDescription: "Это правило запрещает PLAYER_NAME использовать любые слова длиннее установленного лимита, а также ограничивать количество слов. Оба ограничения настраиваются независимо. Не влияет на текст OOC, но влияет на шепот. Примечание. Установка «0» означает, что эта часть не ограничена. (∞), поскольку есть еще одно правило, полностью запрещающее открытые разговоры.",
		keywords: ["limit", "restrict", "length", "count"],
		triggerTexts: {
			infoBeep: "You broke the doll talk rule!",
			attempt_log: "PLAYER_NAME tried to break the doll talk rule",
			log: "PLAYER_NAME broke the doll talk rule",
		},
		defaultLimit: ConditionsLimit.normal,
		dataDefinition: {
			maxWordLength: {
				type: "number",
				default: 6,
				description: "Макс. Длина символов любого слова:",
				Y: 420,
			},
			maxNumberOfWords: {
				type: "number",
				default: 5,
				description: "Макс. количество слов в сообщении:",
				Y: 570,
			},
		},
		init(state) {
			const check = (msg: SpeechMessageInfo): boolean => {
				if ((msg.type !== "Chat" && msg.type !== "Whisper") || state.customData == null)
					return true;
				const words = Array.from((msg.noOOCMessage ?? msg.originalMessage).matchAll(/[^\t\p{Z}\v.:!?~,;^]+/gmu)).map(i => i[0]);
				if (state.customData.maxNumberOfWords && words.length > state.customData.maxNumberOfWords)
					return false;
				if (state.customData.maxWordLength && words.some(word => word.length > state.customData!.maxWordLength))
					return false;
				return true;
			};
			registerSpeechHook({
				allowSend: (msg) => {
					if (state.isEnforced && !check(msg)) {
						state.triggerAttempt();
						return SpeechHookAllow.BLOCK;
					}
					return SpeechHookAllow.ALLOW;
				},
				onSend: (msg) => {
					if (state.inEffect && !check(msg)) {
						state.trigger();
					}
				},
			});
		},
	});

	registerRule("speech_ban_words", {
		name: "Запретить произносить определенные слова в чате",
		type: RuleType.Speech,
		shortDescription: "на основе настраиваемого черного списка",
		longDescription: "Это правило запрещает PLAYER_NAME использовать определенные слова в чате. Список запрещенных слов можно настроить. Проверки не чувствительны к регистру (запрет 'нет' также запрещает 'НЕТ' и 'Нет'). Не влияет на эмоции и текст OOC, но влияет на шепот.",
		keywords: ["limit", "restrict", "blacklist", "blocklist", "forbidden"],
		triggerTexts: {
			infoBeep: "Вам не разрешено использовать слово 'USED_WORD'!",
			attempt_log: "PLAYER_NAME пытался использовать запрещенное слово 'USED_WORD'",
			log: "PLAYER_NAME использовал запрещенное слово 'USED_WORD'",
		},
		defaultLimit: ConditionsLimit.normal,
		dataDefinition: {
			bannedWords: {
				type: "stringList",
				default: [],
				description: "Все запрещенные слова:",
				options: {
					validate: /^[\p{L} ]*$/iu,
				},
			},
		},
		init(state) {
			let transgression: undefined | string;
			const check = (msg: SpeechMessageInfo): boolean => {
				if ((msg.type !== "Chat" && msg.type !== "Whisper") || !state.customData?.bannedWords)
					return true;
				transgression = state.customData?.bannedWords.find(i =>
					(msg.noOOCMessage ?? msg.originalMessage).toLocaleLowerCase().match(
						new RegExp(`([^\\p{L}]|^)${escapeRegExp(i.trim())}([^\\p{L}]|$)`, "iu")
					)
				);
				return transgression === undefined;
			};
			registerSpeechHook({
				allowSend: (msg) => {
					if (state.isEnforced && !check(msg) && transgression !== undefined) {
						state.triggerAttempt(null, { USED_WORD: transgression });
						return SpeechHookAllow.BLOCK;
					}
					return SpeechHookAllow.ALLOW;
				},
				onSend: (msg) => {
					if (state.inEffect && !check(msg) && transgression !== undefined) {
						state.trigger(null, { USED_WORD: transgression });
					}
				},
			});
		},
	});

	registerRule("speech_ban_words_in_emotes", {
		name: "Запретить произносить определенные слова в эмоциях",
		type: RuleType.Speech,
		shortDescription: "на основе настраиваемого черного списка",
		longDescription: "Это правило запрещает PLAYER_NAME использовать определенные слова в каких-либо эмотических сообщениях. Список запрещенных слов можно настроить. Проверки не чувствительны к регистру (запрет 'нет' также запрещает 'НЕТ' и 'Нет').",
		keywords: ["limit", "restrict", "blacklist", "blocklist", "forbidden"],
		triggerTexts: {
			infoBeep: "Вам не разрешено использовать слово 'USED_WORD'!",
			attempt_log: "PLAYER_NAME пытался использовать запрещенное слово 'USED_WORD'",
			log: "PLAYER_NAME использовал запрещенное слово 'USED_WORD'",
		},
		defaultLimit: ConditionsLimit.limited,
		dataDefinition: {
			bannedWords: {
				type: "stringList",
				default: [],
				description: "Все запрещенные слова:",
				options: {
					validate: /^[\p{L} ]*$/iu,
				},
			},
		},
		init(state) {
			let transgression: undefined | string;
			const check = (msg: SpeechMessageInfo): boolean => {
				if (msg.type !== "Emote" || !state.customData?.bannedWords)
					return true;
				transgression = state.customData?.bannedWords.find(i =>
					(msg.noOOCMessage ?? msg.originalMessage).toLocaleLowerCase().match(
						new RegExp(`([^\\p{L}]|^)${escapeRegExp(i.trim())}([^\\p{L}]|$)`, "iu")
					)
				);
				return transgression === undefined;
			};
			registerSpeechHook({
				allowSend: (msg) => {
					if (state.isEnforced && !check(msg) && transgression !== undefined) {
						state.triggerAttempt(null, { USED_WORD: transgression });
						return SpeechHookAllow.BLOCK;
					}
					return SpeechHookAllow.ALLOW;
				},
				onSend: (msg) => {
					if (state.inEffect && !check(msg) && transgression !== undefined) {
						state.trigger(null, { USED_WORD: transgression });
					}
				},
			});
		},
	});

	registerRule("speech_forbid_open_talking", {
		name: "Запретить говорить открыто",
		type: RuleType.Speech,
		shortDescription: "в чате",
		longDescription: "Это правило запрещает PLAYER_NAME чтобы отправить сообщение всем людям в чате. Не влияет на шепот или эмоции, но влияет OOC.",
		keywords: ["limit", "restrict", "loud", "saying", "speaking", "chatting"],
		triggerTexts: {
			infoBeep: "В чатах нельзя открыто разговаривать!",
			attempt_log: "PLAYER_NAME пытался открыто говорить в комнате",
			log: "PLAYER_NAME открыто говорил в комнате",
		},
		defaultLimit: ConditionsLimit.blocked,
		init(state) {
			const check = (msg: SpeechMessageInfo): boolean => msg.type !== "Chat";
			registerSpeechHook({
				allowSend: (msg) => {
					if (state.isEnforced && !check(msg)) {
						state.triggerAttempt();
						return SpeechHookAllow.BLOCK;
					}
					return SpeechHookAllow.ALLOW;
				},
				onSend: (msg) => {
					if (state.inEffect && !check(msg)) {
						state.trigger();
					}
				},
			});
		},
	});

	registerRule("speech_limit_open_talking", {
		name: "Ограничьте разговоры открыто",
		type: RuleType.Speech,
		loggable: false,
		shortDescription: "разрешать только определенное количество сообщений чата в минуту",
		longDescription: "Это правило ограничивает PLAYER_NAME's возможность отправлять сообщения всем людям в чате только на заданное количество в минуту. Не влияет на шепот и эмоции, но влияет на внешний вид. Примечание. Установка '0' не будет иметь никакого эффекта, поскольку существует другое правило, полностью запрещающее открытые разговоры.",
		keywords: ["limit", "restrict", "loud", "saying", "speaking", "chatting", "slow", "fast"],
		triggerTexts: {
			infoBeep: "Вы превысили разрешенное количество сообщений в чате в минуту!",
		},
		dataDefinition: {
			maxNumberOfMsg: {
				type: "number",
				default: 42,
				description: "Максимально допустимое количество сообщений чата в минуту (> 0):",
				Y: 380,
			},
		},
		defaultLimit: ConditionsLimit.blocked,
		init(state) {
			let currentCount: number = 0;
			const check = (msg: SpeechMessageInfo): boolean => msg.type !== "Chat";
			registerSpeechHook({
				allowSend: (msg) => {
					if (state.customData?.maxNumberOfMsg && state.customData.maxNumberOfMsg !== 0 && state.isEnforced && !check(msg)) {
						if (currentCount >= state.customData.maxNumberOfMsg) {
							state.triggerAttempt();
							return SpeechHookAllow.BLOCK;
						}
						BCX_setTimeout(() => {
							if (currentCount > 0) {
								currentCount--;
							}
						}, 60_000);
					}
					return SpeechHookAllow.ALLOW;
				},
				onSend: (msg) => {
					if (state.customData?.maxNumberOfMsg && state.customData.maxNumberOfMsg !== 0 && state.isEnforced && !check(msg)) {
						currentCount++;
					}
				},
			});
		},
	});

	registerRule("speech_forbid_emotes", {
		name: "Запретить использование эмоций",
		type: RuleType.Speech,
		shortDescription: "в чате",
		longDescription: "Это правило запрещает PLAYER_NAME отправить эмоцию (с * или /me) всем людям в чате.",
		keywords: ["limit", "restrict", "emoting", "acting"],
		triggerTexts: {
			infoBeep: "Вам запрещено использовать эмоции в чатах!",
			attempt_log: "PLAYER_NAME пытался использовать эмоцию в комнате",
			log: "PLAYER_NAME использовал эмоцию в комнате",
		},
		defaultLimit: ConditionsLimit.blocked,
		init(state) {
			const check = (msg: SpeechMessageInfo): boolean => msg.type !== "Emote";
			registerSpeechHook({
				allowSend: (msg) => {
					if (state.isEnforced && !check(msg)) {
						state.triggerAttempt();
						return SpeechHookAllow.BLOCK;
					}
					return SpeechHookAllow.ALLOW;
				},
				onSend: (msg) => {
					if (state.inEffect && !check(msg)) {
						state.trigger();
					}
				},
			});
		},
	});

	registerRule("speech_limit_emotes", {
		name: "Ограничьте использование эмоций",
		type: RuleType.Speech,
		loggable: false,
		shortDescription: "разрешить только определенное количество эмоций в минуту",
		longDescription: "Это правило запрещает PLAYER_NAME отправить эмоцию (с * или /me) всем людям в чате только заданное количество в минуту. Примечание. Установка значения '0' не будет иметь никакого эффекта, поскольку существует другое правило, полностью запрещающее использование эмоций.",
		keywords: ["restrict", "emoting", "acting", "slow", "fast"],
		triggerTexts: {
			infoBeep: "Вы превысили разрешенное количество эмоций в минуту!",
		},
		dataDefinition: {
			maxNumberOfEmotes: {
				type: "number",
				default: 42,
				description: "Максимально допустимое количество эмоций в минуту (> 0):",
				Y: 380,
			},
		},
		defaultLimit: ConditionsLimit.blocked,
		init(state) {
			let currentCount: number = 0;
			const check = (msg: SpeechMessageInfo): boolean => msg.type !== "Emote";
			registerSpeechHook({
				allowSend: (msg) => {
					if (state.customData?.maxNumberOfEmotes && state.customData.maxNumberOfEmotes !== 0 && state.isEnforced && !check(msg)) {
						if (currentCount >= state.customData.maxNumberOfEmotes) {
							state.triggerAttempt();
							return SpeechHookAllow.BLOCK;
						}
						currentCount++;
						BCX_setTimeout(() => {
							if (currentCount > 0) {
								currentCount--;
							}
						}, 60_000);
					}
					return SpeechHookAllow.ALLOW;
				},
			});
		},
	});

	registerRule("speech_restrict_whisper_send", {
		name: "Ограничить отправку шепота",
		type: RuleType.Speech,
		shortDescription: "кроме определенных ролей",
		longDescription: "Это правило запрещает PLAYER_NAME шептать что-либо большинству людей в чате, кроме определенных ролей. Также влияет на сообщения OOC, передаваемые шепотом.",
		keywords: ["limit", "forbid", "whispering", "allowlist", "block", "whitelist"],
		triggerTexts: {
			infoBeep: "Вам не разрешено шептаться TARGET_PLAYER!",
			attempt_log: "PLAYER_NAME пытался шепнуть TARGET_PLAYER",
			log: "PLAYER_NAME прошептал TARGET_PLAYER",
		},
		defaultLimit: ConditionsLimit.limited,
		dataDefinition: {
			minimumPermittedRole: {
				type: "roleSelector",
				default: AccessLevel.mistress,
				description: "Минимальная роль шепота по-прежнему разрешена:",
			},
		},
		init(state) {
			const check = (msg: SpeechMessageInfo): boolean => {
				const target = msg.target != null && getChatroomCharacter(msg.target);
				return msg.type !== "Whisper" || !target || !state.customData?.minimumPermittedRole || getCharacterAccessLevel(target) <= state.customData.minimumPermittedRole;
			};
			registerSpeechHook({
				allowSend: (msg) => {
					if (state.isEnforced && !check(msg) && msg.target != null) {
						state.triggerAttempt(msg.target);
						return SpeechHookAllow.BLOCK;
					}
					return SpeechHookAllow.ALLOW;
				},
				onSend: (msg) => {
					if (state.inEffect && !check(msg) && msg.target != null) {
						state.trigger(msg.target);
					}
				},
			});
		},
	});

	registerRule("speech_restrict_whisper_receive", {
		name: "Ограничить получение шепота",
		type: RuleType.Speech,
		loggable: false,
		shortDescription: "кроме определенных ролей",
		longDescription: "Предотвращает PLAYER_NAME от получения каких-либо шепотов, кроме как от определенных ролей. Если кто-то попытается отправить PLAYER_NAME сообщение шепотом, пока это правило активно, они получают шепот автоответа, если для правила установлен автоответчик (текстовое поле не пусто). PLAYER_NAME не получит никаких указаний на то, что она получила бы шепот, если бы правило не применялось; в этом случае она увидит и шепот, и автоматический ответ. Это правило также может использоваться (домами), чтобы предотвратить нежелательные шепоты от незнакомцев в общественных местах.",
		keywords: ["limit", "forbid", "prevent", "whispering", "hearing", "listening", "allowlist", "block", "whitelist"],
		defaultLimit: ConditionsLimit.blocked,
		dataDefinition: {
			minimumPermittedRole: {
				type: "roleSelector",
				default: AccessLevel.whitelist,
				description: "Минимальная роль, по-прежнему позволяющая отправить шепот:",
				Y: 480,
			},
			autoreplyText: {
				type: "string",
				default: "PLAYER_NAME is currently forbidden to receive whispers.",
				description: "Автоматически отвечает заблокированному отправителю следующим образом:",
				Y: 320,
				options: /^([^/.*].*)?$/,
			},
		},
		load(state) {
			hookFunction("ChatRoomMessage", 5, (args, next) => {
				const data = args[0];

				if (isObject(data) &&
					typeof data.Content === "string" &&
					data.Content !== "" &&
					data.Type === "Whisper" &&
					typeof data.Sender === "number" &&
					state.inEffect &&
					state.customData
				) {
					const character = getChatroomCharacter(data.Sender);
					if (character && getCharacterAccessLevel(character) >= state.customData.minimumPermittedRole) {
						if (state.customData.autoreplyText && !data.Content?.startsWith("[Automatic reply by BCX]\n")) {
							const msg = `[Automatic reply by BCX]\n${dictionaryProcess(state.customData.autoreplyText, {})}`;
							ServerSend("ChatRoomChat", {
								Content: msg,
								Type: "Whisper",
								Target: data.Sender,
							});
							if (!state.isEnforced) {
								ChatRoomSendLocal(msg);
							}
						}
						if (state.isEnforced) return;
					}
				}
				return next(args);
			}, ModuleCategory.Rules);
		},
	});

	registerRule("speech_restrict_beep_send", {
		name: "Ограничить отправку звуковых сообщений",
		type: RuleType.Speech,
		shortDescription: "кроме избранных участников",
		longDescription: "Это правило запрещает PLAYER_NAME отправлять любые звуковые сигналы с сообщением, кроме определенного списка номеров участников. На отправку звуковых сигналов без сообщения это не влияет. При желании можно установить, что PLAYER_NAME запрещено подавать звуковые сигналы только тогда, когда она не может использовать свои руки (например, прикреплена к кресту).",
		triggerTexts: {
			infoBeep: "Вы нарушили правило, запрещающее отправлять звуковые сообщения TARGET_PLAYER!",
			attempt_log: "PLAYER_NAME нарушил правило, попытавшись отправить звуковой сигнал TARGET_PLAYER",
			log: "PLAYER_NAME нарушил правило, отправив звуковое сообщение на TARGET_PLAYER",
		},
		keywords: ["limit", "forbid", "prevent", "whitelist", "allowlist"],
		defaultLimit: ConditionsLimit.blocked,
		dataDefinition: {
			whitelistedMemberNumbers: {
				type: "memberNumberList",
				default: [],
				description: "Номера участников по-прежнему разрешены для подачи звукового сигнала:",
				options: {
					pageSize: 2,
				},
			},
			onlyWhenBound: {
				type: "toggle",
				default: false,
				description: "Действует только тогда, когда невозможно использовать руки.",
				Y: 700,
			},
		},
		load(state) {
			hookFunction("FriendListBeepMenuSend", 5, (args, next) => {
				if (state.inEffect &&
					state.customData &&
					(document.getElementById("FriendListBeepTextArea") as HTMLTextAreaElement | null)?.value &&
					FriendListBeepTarget != null &&
					!state.customData.whitelistedMemberNumbers.includes(FriendListBeepTarget) &&
					(!Player.CanInteract() || !state.customData.onlyWhenBound)
				) {
					if (state.isEnforced) {
						state.triggerAttempt(FriendListBeepTarget);
						return;
					}
					state.trigger(FriendListBeepTarget);
				}
				return next(args);
			}, ModuleCategory.Rules);
		},
	});

	registerRule("speech_restrict_beep_receive", {
		name: "Ограничить получение звуковых сигналов",
		type: RuleType.Speech,
		loggable: false,
		shortDescription: "и звуковые сообщения, кроме избранных участников",
		longDescription: "Это правило предотвращает PLAYER_NAME от получения каких-либо звуковых сигналов (независимо от того, несет ли этот звуковой сигнал сообщение или нет), за исключением звуковых сигналов из определенного списка номеров участников. Если кто-то попытается отправить PLAYER_NAME звуковое сообщение, пока это правило запрещает им это делать, они получают звуковой сигнал автоответа, если для правила установлен автоответчик. PLAYER_NAME не получит никаких указаний на то, что она получила бы звуковой сигнал, если бы правило не применялось; в этом случае она увидит и звуковой сигнал, и автоматический ответ. При желании правило можно настроить так, чтобы оно активировалось только во время PLAYER_NAME не может пользоваться руками (например, прикреплена к кресту).",
		keywords: ["limit", "forbid", "prevent", "reading", "whitelist", "allowlist"],
		defaultLimit: ConditionsLimit.blocked,
		dataDefinition: {
			whitelistedMemberNumbers: {
				type: "memberNumberList",
				default: [],
				description: "Номера участников, которым по-прежнему разрешено отправлять звуковые сигналы:",
				Y: 470,
				options: {
					pageSize: 2,
				},
			},
			autoreplyText: {
				type: "string",
				default: "PLAYER_NAME is currently forbidden to receive beeps.",
				description: "Автоматически отвечает заблокированному отправителю следующим образом:",
				Y: 300,
			},
			onlyWhenBound: {
				type: "toggle",
				default: false,
				description: "Действует только тогда, когда невозможно использовать руки.",
				Y: 740,
			},
		},
		load(state) {
			hookFunction("ServerAccountBeep", 5, (args, next) => {
				const data = args[0];

				if (isObject(data) &&
					!data.BeepType &&
					typeof data.MemberNumber === "number" &&
					state.inEffect &&
					state.customData &&
					!state.customData.whitelistedMemberNumbers.includes(data.MemberNumber) &&
					(!Player.CanInteract() || !state.customData.onlyWhenBound)
				) {
					if (state.customData.autoreplyText && (data.Message == null || (typeof data.Message === "string" && !data.Message.startsWith("[Automatic reply by BCX]\n")))) {
						const msg = `[Automatic reply by BCX]\n${dictionaryProcess(state.customData.autoreplyText, {})}`;
						ServerSend("AccountBeep", {
							MemberNumber: data.MemberNumber,
							BeepType: "",
							Message: msg,
							IsSecret: true,
						});
						if (!state.isEnforced) {
							ChatRoomSendLocal(msg);
							FriendListBeepLog.push({
								MemberNumber: data.MemberNumber,
								MemberName: Player.FriendNames?.get(data.MemberNumber) || "Unknown",
								ChatRoomName: undefined,
								Sent: true,
								Private: false,
								Time: new Date(),
								Message: msg,
							});
						}
					}
					if (state.isEnforced) return;
				}
				return next(args);
			}, ModuleCategory.Rules);
		},
	});

	registerRule("speech_greet_order", {
		name: "Приказ поприветствовать клуб",
		type: RuleType.Speech,
		loggable: false,
		shortDescription: "при входе в него через портал входа",
		longDescription: "PLAYER_NAME автоматически отправит все определенные номера участников (если они в данный момент онлайн и являются друзьями с PLAYER_NAME) звуковой сигнал в тот момент PLAYER_NAME присоединяется к клубу или в тот момент, когда она запускает BCX, чтобы заявить о своем присутствии. Отключения не считаются повторным входом в клуб, насколько это можно обнаружить. ПРИМЕЧАНИЕ. При использовании этого правила не следует выбирать условия триггера, так как если вы, например, выберете 'когда в публичной комнате', правило будет приветствовать только тогда, когда вы загружаете BCX в публичной комнате.",
		keywords: ["beep", "loging", "in", "online"],
		triggerTexts: {
			infoBeep: "Правило BCX предписывало приветствовать одного или нескольких человек (если они в данный момент находятся в сети) звуковым сигналом.",
			attempt_log: "",
			log: "",
		},
		defaultLimit: ConditionsLimit.blocked,
		dataDefinition: {
			toGreetMemberNumbers: {
				type: "memberNumberList",
				default: [],
				description: "Номера участников, которых будут приветствовать:",
			},
		},
		load(state) {
			if (state.isEnforced && state.customData) {
				for (const number of state.customData.toGreetMemberNumbers) {
					ServerSend("AccountBeep", {
						MemberNumber: number,
						BeepType: "",
						IsSecret: true,
					});
				}
				if (state.customData.toGreetMemberNumbers.length > 0) {
					BCX_setTimeout(() => {
						state.trigger();
					}, 5_000);
				}
			}
		},
	});

	registerRule("speech_block_antigarble", {
		name: "Запретить опцию antigarble",
		type: RuleType.Speech,
		shortDescription: "Команда .antigarble BCX",
		longDescription: "Это правило запрещает PLAYER_NAME использовать команду antigarble. Antigarble — это функция BCX, которая позволяет пользователю BCX понимать приглушенные голоса других персонажей с кляпом во рту или при ношении оглушающего предмета. Если PLAYER_NAME следует запретить использование команды, следует использовать это правило.",
		keywords: ["limit", "forbid", "prevent", "garbling", "deafness", "gagged", "gagtalk"],
		triggerTexts: {
			infoBeep: "Вам не разрешено использовать команду antigarble!",
			attempt_log: "PLAYER_NAME пытался использовать команду antigarble",
			log: "PLAYER_NAME использовал команду antigarble",
		},
		defaultLimit: ConditionsLimit.normal,
		// Implemented externally
	});

	/* TODO: Implement
	registerRule("speech_replace_spoken_words", {
		name: "Replace spoken words",
		type: RuleType.Speech,
		loggable: false,
		shortDescription: "with others in all chat, whisper and OOC messages",
		longDescription: "Automatically replaces specific words PLAYER_NAME uses in chat messages, whispers and OOC with another set word from a defineable a list of words with a special syntax (e.g. [Clare,Lily;Mistress],[Claudia;the maid],[I;this slut]).",
		defaultLimit: ConditionsLimit.limited,
		dataDefinition: {
			stringWithReplacingSyntax: {
				type: "string",
				default: "[I,me;this cutie],[spoken_word;replaced_with_this_word]",
				description: "List in syntax: [word1;substitute1],[w2,w3,...;s2],...",
				options: /^([^/.*()][^()]*)?$/
			}
		}
	});
	*/

	/* TODO: Implement
	// TODO: { TARGET_PLAYER: `${msg.target ? getCharacterName(msg.target, "[unknown]") : "[unknown]"} (${msg.target})` }
	registerRule("speech_using_honorifics", {
		name: "Using honorifics",
		type: RuleType.Speech,
		shortDescription: "in front of specific names in all chat, whisper and OOC messages",
		longDescription: "Define a listing of words (e.g. Miss, Mistress, ...) where one of them always needs to be typed before any one out of a listing of names (e.g. Julia, Eve, ...) in all chat, whisper and OOC messages. Needs a certain syntax (e.g. [Goddess,Mistress;Lily,Clare],[slut;Mona], ...)",
		triggerTexts: {
			infoBeep: "You broke a rule to always use a honorific when speaking TARGET_PLAYER's name!",
			attempt_log: "PLAYER_NAME almost broke a rule by forgetting to be polite to TARGET_PLAYER",
			log: "PLAYER_NAME broke a rule by forgetting to be polite to TARGET_PLAYER"
		},
		defaultLimit: ConditionsLimit.normal,
		dataDefinition: {
			stringWithRuleSyntax: {
				type: "string",
				default: "",
				description: "List in syntax: [honorific1;name1],[h2,h3,...;n2,n3,...],...",
				options: /^([^/.*()\s][^()]*)?$/
			}
		}
	});
	*/

	registerRule("speech_force_retype", {
		name: "Заставить перепечатать",
		type: RuleType.Speech,
		loggable: false,
		shortDescription: "если отправка сообщения в чат отклонена BCX из-за нарушения правил",
		longDescription: "Это правило заставляет PLAYER_NAME перепечатывать любое сообщение чата, шепота, эмоций или OOC в качестве наказания при попытке отправить его, а другое принудительное речевое правило BCX определяет, что в этом сообщении есть какое-либо нарушение правил.",
		keywords: ["punish", "retry", "clear", "input", "blocked", "forbidden"],
		defaultLimit: ConditionsLimit.limited,
		// Implemented externally
	});

	let alreadyGreeted = false;
	let lastRoomName: string = "";
	registerRule("greet_room_order", {
		name: "Заказ приветственной комнаты",
		type: RuleType.Speech,
		shortDescription: "с настраиваемым предложением при его новом вводе",
		longDescription: "Устанавливает конкретное предложение, которое PLAYER_NAME необходимо громко произнести, войдя в комнату, которая не пуста. Предложение автоматически заполняет ввод текста в окне чата. Когда сказать это, остается за PLAYER_NAME, но когда правило применяется, это единственное, что можно сказать в этой комнате после присоединения к ней. Однако эмоции по-прежнему можно использовать, если только их не запретить. Отключения не считаются повторным входом в новую комнату, насколько это можно обнаружить.",
		keywords: ["say", "present", "introduce"],
		triggerTexts: {
			infoBeep: "Ты нарушил правило приветствовать эту комнату так, как учили!",
			attempt_infoBeep: "Вам нужно приветствовать эту комнату так, как учили!",
			attempt_log: "PLAYER_NAME чуть не нарушил правило, не поприветствовав комнату, как учили",
			log: "PLAYER_NAME нарушил правило, не поприветствовав комнату, как учили",
		},
		defaultLimit: ConditionsLimit.limited,
		dataDefinition: {
			greetingSentence: {
				type: "string",
				default: "",
				description: "Предложение, которое следует использовать для приветствия любой объединенной комнаты:",
				options: /^([^/.*()\s][^()]*)?$/,
			},
			affectEmotes: {
				type: "toggle",
				default: false,
				description: "Также запретите отправлять сообщения с эмоциями перед приветствием.",
				Y: 560,
			},
		},
		load(state) {
			// 1. hook ChatRoomSync to set alreadyGreeted to false if the room name is different from the one stored locally
			hookFunction("ChatRoomSync", 0, (args, next) => {
				const data = args[0];
				if (data.Name !== lastRoomName) alreadyGreeted = false;
				next(args);
				// 2. populate chat field with the default text from the rule
				const chat = document.getElementById("InputChat") as HTMLTextAreaElement | null;
				if (chat && state.customData && state.inEffect && !alreadyGreeted && data.Name !== lastRoomName) {
					chat.value = state.customData.greetingSentence;
				} else {
					alreadyGreeted = true;
				}
			}, ModuleCategory.Rules);
		},
		// 3. do not allow sending anything else when enforced
		init(state) {
			const check = (msg: SpeechMessageInfo): boolean => (
				(msg.noOOCMessage ?? msg.originalMessage).toLocaleLowerCase() === state.customData?.greetingSentence.trim().toLocaleLowerCase() &&
				msg.type === "Chat"
			);
			registerSpeechHook({
				allowSend: (msg) => {
					if (state.isEnforced &&
						state.customData?.greetingSentence.trim() &&
						!alreadyGreeted &&
						(msg.type !== "Emote" || (msg.type === "Emote" && state.customData.affectEmotes))
					) {
						if (ChatRoomData?.Name) {
							lastRoomName = ChatRoomData.Name;
						}
						// 4. set alreadyGreeted to true and overwrite lastRoomName
						if (check(msg)) {
							alreadyGreeted = true;
							return SpeechHookAllow.ALLOW_BYPASS;
						} else {
							state.triggerAttempt();
							ChatRoomSendLocal(`You are expected to greet the room with "${state.customData?.greetingSentence}".`);
							return SpeechHookAllow.BLOCK;
						}
					}
					return SpeechHookAllow.ALLOW;
				},
				onSend: (msg) => {
					if (msg.type === "Emote") {
						return;
					}
					if (state.inEffect &&
						state.customData?.greetingSentence.trim() &&
						!alreadyGreeted
					) {
						if (!check(msg)) {
							state.trigger();
						}
						alreadyGreeted = true;
					}
				},
			});
		},
	});

	registerRule("greet_new_guests", {
		name: "Приветствуйте новых гостей",
		type: RuleType.Speech,
		loggable: false,
		shortDescription: "когда они присоединяются к текущей комнате",
		longDescription: "Силы PLAYER_NAME приветствовать людей, впервые входящих в текущий чат, заданным предложением. ПРИМЕЧАНИЕ. Только PLAYER_NAME и новый гость сможет увидеть сообщение, чтобы не превратить его в спам. После того, как нового человека поприветствовали, его не будут приветствовать в течение 10 минут после того, как он покинул (в том числе отключился) комнату. PLAYER_NAME включен. Установка эмоции в качестве приветствия также поддерживается путем начала установленного сообщения с одного или двух символов '*'.",
		keywords: ["say", "present", "introduce"],
		defaultLimit: ConditionsLimit.limited,
		dataDefinition: {
			greetingSentence: {
				type: "string",
				default: "",
				description: "Предложение, которое будет использоваться для приветствия новых гостей:",
				options: /^([^/.].*)?$/,
			},
		},
		load(state) {
			const GREET_DELAY = 600_000;
			const nextGreet: Map<number, number> = new Map();
			hookFunction("ChatRoomSyncMemberLeave", 2, (args, next) => {
				next(args);
				const R = args[0];
				if (nextGreet.has(R.SourceMemberNumber)) {
					nextGreet.set(R.SourceMemberNumber, Date.now() + GREET_DELAY);
				}
			}, ModuleCategory.Rules);
			hookFunction("ChatRoomAddCharacterToChatRoom", 3, (args, next) => {
				const size = ChatRoomCharacter.length;
				next(args);
				if (state.customData && state.isEnforced && size < ChatRoomCharacter.length) {
					const C = args[0];
					if (C.MemberNumber !== undefined &&
						nextGreet.has(C.MemberNumber) &&
						nextGreet.get(C.MemberNumber)! < Date.now()
					) {
						nextGreet.delete(C.MemberNumber);
					}
					BCX_setTimeout(() => {
						if (!state.customData ||
							!state.isEnforced ||
							!ChatRoomCharacter.includes(C) ||
							C.MemberNumber === undefined ||
							(
								nextGreet.has(C.MemberNumber) &&
								nextGreet.get(C.MemberNumber)! >= Date.now()
							)
						) return;
						nextGreet.set(C.MemberNumber, 0);
						if (state.customData.greetingSentence.startsWith("*")) {
							const message = state.customData.greetingSentence.slice(1);
							ServerSend("ChatRoomChat", { Content: message, Type: "Emote", Target: C.MemberNumber });
							ServerSend("ChatRoomChat", { Content: message, Type: "Emote", Target: Player.MemberNumber });
						} else {
							ServerSend("ChatRoomChat", { Content: state.customData.greetingSentence, Type: "Chat", Target: C.MemberNumber });
							ServerSend("ChatRoomChat", { Content: state.customData.greetingSentence, Type: "Chat", Target: Player.MemberNumber });
						}
					}, 5_000);
				}
			}, ModuleCategory.Rules);
		},
	});

	// Restrained speech:
	// the wearer is unable to speak freely, she is given a set of sentences/targets allowed and can only use those with the #name talk command.
	// The given sentences can contain the %target% placeholder to have the target inserted into the sentence. The given sentences can contain
	// the %self% placeholder which will be replaced by the given "self" attribute. By default it is "I", but could be changed to something else
	// to avoid having to rewrite all the sentences. WARNING: a target id and a message id always needs to be specified. Therefore, you will be
	// softlocked/muted if this mode is enabled and you remove all sentences and/or targets.
	/* TODO: Implement
	registerRule("speech_restrained_speech", {
		name: "Restrained speech",
		type: RuleType.Speech,
		shortDescription: "only the set sentences are allowed to be spoken",
		// TODO: needs an updated describing the special wildcards or placeholders that can be used
		longDescription: "This rule no longer allows PLAYER_NAME to speak freely, she is given a set of sentences allowed and can only use those in chat and whispers. Does not affect OOC.",
		triggerTexts: {
			infoBeep: "You broke a rule by not using one of the allowed phrases for you!",
			attempt_log: "PLAYER_NAME broke a rule by trying to not use one of the allowed phrases",
			log: "PLAYER_NAME broke a rule by not using one of the allowed phrases"
		},
		defaultLimit: ConditionsLimit.blocked,
		dataDefinition: {
			listOfAllowedSentences: {
				type: "stringList",
				default: [],
				// TODO: needs an update describing the special wildcards or placeholders that can be used
				description: "Only these phrases are still allowed:",
				options: {
					validate: /^([^/.*()][^()]*)?$/ // TODO: adjust
				}
			}
		}
	});
	*/

	registerRule("speech_alter_faltering", {
		name: "Обеспечьте прерывистую речь",
		type: RuleType.Speech,
		loggable: false,
		shortDescription: "добавлен усиленный эффект шиповки PLAYER_NAME's тексты чата",
		longDescription: "Таким образом правило преобразуется PLAYER_NAME's сообщений, поэтому по какой-то причине [RP] (тревога, возбуждение, страх и т. д.) она может говорить только заикаясь и произнося случайные звуки-наполнители. Автоматически преобразует набранный текст чата. Влияет на сообщения чата и шепот, но не на ООС.",
		keywords: ["garble", "saying", "talking"],
		defaultLimit: ConditionsLimit.limited,
		init(state) {
			registerSpeechHook({
				modify: (msg, text) => {
					if (state.inEffect && (msg.type === "Chat" || msg.type === "Whisper")) {
						return falteringSpeech(text);
					} else {
						return text;
					}
				},
			});
		},
	});

	registerRule("speech_mandatory_words", {
		name: "Установите обязательные слова",
		type: RuleType.Speech,
		shortDescription: "из которых хотя бы один всегда необходимо включать в разговор",
		longDescription: "Это правило дает PLAYER_NAME список слов, из которых хотя бы одно всегда должно использоваться в любом сообщении чата. Список обязательных слов можно настроить. Проверки не чувствительны к регистру (добавление 'miss' также работает для 'MISS' и 'Miss' — Примечание: 'Miiiiissss' также будет соответствовать). Не влияет на шепот, эмоции и текст OOC. Также есть переключатель для воздействия на шепот.",
		keywords: ["force", "require", "talking", "saying", "certain", "specific"],
		triggerTexts: {
			infoBeep: "Вы забыли указать одно из обязательных слов!",
			attempt_log: "PLAYER_NAME чуть не забыл использовать обязательное слово во время разговора",
			log: "PLAYER_NAME не использовал обязательное слово во время разговора",
		},
		defaultLimit: ConditionsLimit.normal,
		dataDefinition: {
			mandatoryWords: {
				type: "stringList",
				default: [],
				description: "Всегда необходимо использовать хотя бы одно из этих слов:",
				options: {
					validate: /^[\p{L} ]*$/iu,
					pageSize: 3,
				},
			},
			affectWhispers: {
				type: "toggle",
				default: false,
				description: "Также влияет на сообщения шепотом",
				Y: 740,
			},
		},
		init(state) {
			const check = (msg: SpeechMessageInfo): boolean => {
				if (
					(msg.type !== "Chat" &&
						!(
							(msg.type === "Whisper" && !(msg.originalMessage.startsWith("!") && !msg.originalMessage.startsWith("!!"))) && state.customData?.affectWhispers
						)
					) || !state.customData?.mandatoryWords?.length)
					return true;
				const checkMsg = (msg.noOOCMessage ?? msg.originalMessage).toLocaleLowerCase();
				const sounds = state.customData?.mandatoryWords.filter(e => /^[\p{L}]*$/iu.test(e));
				if (checkMsg.trim() === "") {
					return true;
				}
				return state.customData?.mandatoryWords.some(i =>
					checkMsg.match(
						new RegExp(`([^\\p{L}]|^)${escapeRegExp(i.trim())}([^\\p{L}]|$)`, "iu")
					)
				) || checkMsg.split(/[^\p{L}]+/u).some(i => checkMessageForSounds(sounds, i, false));
			};
			registerSpeechHook({
				allowSend: (msg) => {
					if (state.isEnforced && !check(msg)) {
						state.triggerAttempt();
						return SpeechHookAllow.BLOCK;
					}
					return SpeechHookAllow.ALLOW;
				},
				onSend: (msg) => {
					if (state.inEffect && !check(msg)) {
						state.trigger();
					}
				},
			});
		},
	});

	registerRule("speech_mandatory_words_in_emotes", {
		name: "Установите обязательные слова в эмоциях",
		type: RuleType.Speech,
		shortDescription: "из которых хотя бы один всегда должен быть включен",
		longDescription: "Это правило дает PLAYER_NAME список слов, из которых хотя бы одно всегда должно использоваться в любом эмоциональном сообщении. Список обязательных слов можно настроить. Проверки не чувствительны к регистру (добавление 'miss' также работает для 'MISS' и 'Miss' — Примечание: 'Miiiiissss' также будет соответствовать).",
		keywords: ["force", "require", "talking", "saying", "certain", "specific"],
		triggerTexts: {
			infoBeep: "Вы забыли указать одно из обязательных слов!",
			attempt_log: "PLAYER_NAME чуть не забыл использовать обязательное слово во время разговора",
			log: "PLAYER_NAME не использовал обязательное слово во время разговора",
		},
		defaultLimit: ConditionsLimit.blocked,
		dataDefinition: {
			mandatoryWords: {
				type: "stringList",
				default: [],
				description: "Всегда необходимо использовать хотя бы одно из этих слов:",
				options: {
					validate: /^[\p{L} ]*$/iu,
				},
			},
		},
		init(state) {
			const check = (msg: SpeechMessageInfo): boolean => {
				if (msg.type !== "Emote" || !state.customData?.mandatoryWords?.length)
					return true;
				const checkMsg = (msg.noOOCMessage ?? msg.originalMessage).toLocaleLowerCase();
				const sounds = state.customData?.mandatoryWords.filter(e => /^[\p{L}]*$/iu.test(e));
				if (checkMsg.trim() === "") {
					return true;
				}
				return state.customData?.mandatoryWords.some(i =>
					checkMsg.match(
						new RegExp(`([^\\p{L}]|^)${escapeRegExp(i.trim())}([^\\p{L}]|$)`, "iu")
					)
				) || checkMsg.split(/[^\p{L}]+/u).some(i => checkMessageForSounds(sounds, i, false));
			};
			registerSpeechHook({
				allowSend: (msg) => {
					if (state.isEnforced && !check(msg)) {
						state.triggerAttempt();
						return SpeechHookAllow.BLOCK;
					}
					return SpeechHookAllow.ALLOW;
				},
				onSend: (msg) => {
					if (state.inEffect && !check(msg)) {
						state.trigger();
					}
				},
			});
		},
	});

	registerRule("speech_partial_hearing", {
		name: "Частичное слушание",
		type: RuleType.Speech,
		shortDescription: "приглушенной речи – на основе случайных чисел и списка слов",
		longDescription: "Это правило дает PLAYER_NAME способность понимать части невнятного предложения без искажений, на основе белого списка слов и/или случайным образом. По умолчанию применяется только к приглушенному слуху из-за оглушающих эффектов на PLAYER_NAME, но опционально может быть расширен, чтобы позволить частично понимать приглушенную речь других людей с нарушениями речи. Не влияет на эмоции и текст OOC.",
		keywords: ["deafness", "garbling", "antigarble", "understanding", "ungarble", "specific", "words", "whitelist", "allowlist"],
		loggable: false,
		defaultLimit: ConditionsLimit.normal,
		dataDefinition: {
			alwaysUnderstandableWords: {
				type: "stringList",
				default: [],
				description: "Слова, которые всегда можно понять:",
				options: {
					validate: /^[\p{L}]*$/iu,
					pageSize: 3,
				},
			},
			randomUnderstanding: {
				type: "toggle",
				default: true,
				description: "Некоторые слова понимаются случайно",
				Y: 650,
			},
			affectGaggedMembersToggle: {
				type: "toggle",
				default: false,
				description: "Также может понимать людей с кляпом во рту",
				Y: 740,
			},
		},
		load(state) {
			hookFunction("SpeechGarble", 2, (args, next) => {
				const C = args[0];
				if (!state.isEnforced ||
					(
						!C.CanTalk() &&
						state.customData &&
						!state.customData.affectGaggedMembersToggle
					)
				)
					return next(args);
				return args[1].replace(/\([^)]+\)?|\p{L}+/gmui, (word) => {
					if (word.startsWith("(")) {
						return word;
					} if (state.customData?.randomUnderstanding && Math.random() < 0.25) {
						return word;
					} else if (state.customData?.alwaysUnderstandableWords.some(
						(str) => word.toLocaleLowerCase() === str.toLocaleLowerCase())) {
						return word;
					} else {
						return callOriginal("SpeechGarble", [args[0], word, args[2]]);
					}
				});
			}, ModuleCategory.Rules);
		},
	});

	registerRule("speech_garble_while_talking", {
		name: "Принудительно искажать речь",
		type: RuleType.Speech,
		loggable: false,
		shortDescription: "сила PLAYER_NAME говорить так, как будто им заткнули рот",
		longDescription: `Это правило заставляет PLAYER_NAME говорить так, как будто им заткнули рот, автоматически искажая всю свою речь. Это правило не влияет на OOC. Это правило влияет только на шепот, если также действует правило 'Шепчет с кляпом во рту'.`,
		keywords: ["saying", "talking", "gagtalk", "garbling", "forced"],
		defaultLimit: ConditionsLimit.normal,
		dataDefinition: {
			gagLevel: {
				type: "number",
				default: 5,
				/**
				 * NOTE: While gag levels above 20 do not have any additional effects in vanilla BC,
				 * FBC's "Extra gag anti-cheat" option (as of 4.22) adds additional garbling at >24.
				 */
				options: {
					min: 1,
					max: 25,
				},
				description: "Уровень принудительного искажения",
			},
		},
		init(state) {
			registerSpeechHook({
				modify: (info, message) => state.isEnforced && info.type === "Chat" ? callOriginal("SpeechGarble", [Player, message, true]) : message,
			});
		},
		load(state) {
			hookFunction("SpeechGetTotalGagLevel", 0, (args, next) => {
				const gagLevel: number = next(args);
				if (!state.isEnforced || !state.customData?.gagLevel || !args[0].IsPlayer()) {
					return gagLevel;
				} else {
					// Use the rule-specified gag level as a lower bound in case the player is wearing an actual gag
					return Math.max(gagLevel, state.customData.gagLevel);
				}
			}, ModuleCategory.Rules);
		},
	});
}
