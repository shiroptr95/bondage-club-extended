export enum Views {
	AuthorityRoles = 10,
	AuthorityPermissions = 11,
	Log = 20,
	LogConfig = 21,
	ConditionsViewCurses = 30,
	ConditionsEditCurses = 31,
	ConditionsGlobalCurses = 32,
	CursesAdd = 33,
	CursesAddPermissionMode = 34,
	ConditionsViewRules = 40,
	ConditionsEditRules = 41,
	ConditionsGlobalRules = 42,
	RulesAdd = 43,
	RulesAddPermissionMode = 44,
	Commands = 50,
	CommandsPermissionMode = 51,
	Relationships = 60,
	ExportImportMain = 91,
	ExportImportSelect = 92,
	Misc = 100,
}

// TODO
export const HELP_TEXTS: Record<Views, string> = {
	[Views.AuthorityRoles]: "Если вам разрешено, этот экран позволяет вам просматривать, добавлять или удалять роли только для BCX. 'Owner' " +
		"and 'Mistress', which expand the classic roles of BC such as Bondage Club's Owner and the Lovers. The hierarchy of all " +
		"roles that can be used to set various things in BCX can be seen on the right. The higher up a role is, the more authority it has. " +
		"For instance, if something applies or is permitted for a Mistress, it also always is for an Owner. Any number of " +
		"Owners and Mistresses can be set. Check their current power over BCX with the button on the right.",
	[Views.AuthorityPermissions]: "Сердце BCX: позволяет настраивать разрешения для установки и использования большинства" +
		"BCX. Default settings depend on the initial BCX setup preset selected. " +
		"Self access is the checkbox next to every permission and the lowest access role is to its right. " +
		"Example: If 'allow forbidding self access', 'allow granting self access', 'allow lowest access modification' have the checkbox removed " +
		"and lowest role is 'Owner', then current and newly added BCX owners and the BC owner can get full control over " +
		"any permissions they have access to. So careful with those three permissions!",
	[Views.Log]: "На этом экране отображаются журналы важных событий. Что регистрируется, зависит от конфигурации журналирования, которую можно просмотреть/редактировать. " +
		"via the button to the right. Log entries can have normal or protected visibility. Access to those as well as removing entries or the " +
		"configuration is determined by the according authority module permission settings. The log can document the BCX's user's conduct, " +
		"any rule violations, important changes made to BCX settings, curses or rules, and notes from other people.",
	[Views.LogConfig]: "Этот экран определяет, что записывается в журнал поведения и какова видимость каждого типа сообщений журнала. " +
		"'Yes' means this log type " +
		"has normal visibility, while 'protected' means only roles who have permission to view protected entries can view them. 'No' means that " +
		"this log type is not logged at all. In the permission settings view of the authority module, the permissions of this log module can be configured.",
	[Views.ConditionsViewCurses]: "На этом экране показаны все активные проклятия на игроке, включая много информации, например продолжительность, если она есть. " +
		"a cursed item/clothing/body slot or a blocked item or clothing slot that forces to stay unrestrained or naked there. Clicking on the button with the cog icon " +
		"in the middle of each row moves you to a new screen that allows to configure the curse (if you have permission). When the cog icon has a blue " +
		"aura, that means that the curse's conditions are the same as the global config. If permitted, you can remove single curses with the 'X' button.",
	[Views.ConditionsEditCurses]: "Здесь вы можете включить/выключить проклятие, установить таймер активации/деактивации/удаления проклятия и " +
		"define when it can trigger, such as either always or based on where the player is and with whom. The small green/red bars next to the " +
		"checkboxes indicate whether a condition is true at present or not and the big bar whether this means that the curse is in effect, if active. " +
		"On the right side, you can curse the usage/" +
		"alteration of an item such as fixing cuffs behind the back. Lastly, in the bottom right you can set the trigger conditions " +
		"of this curse to the global curses config.",
	[Views.ConditionsGlobalCurses]: "Настройки на этой странице являются глобальными настройками/настройками по умолчанию для всех вновь добавленных проклятий. Изменения в триггере " +
		"conditions are also applied to existing curses that are (still) set to global curses configuration, though. Exception is if a timer is set here. " +
		"Such a timer only applies to newly created curses.",
	[Views.CursesAdd]: "Здесь вы можете наложить проклятие на любой пустой слот (белый), который останется пустым, или на любой надетый предмет (золотой). " +
		"which will prevent removal. You add the curse by simply clicking the slot which then becomes purple to indicate that " +
		"it is now cursed. Grey slots indicate " +
		"that you have no access to them, due to them being blocked or due to your permission settings. Slots can be limited/blocked via the settings button " +
		"on the very right. The screen has a second page for the character's body slots.",
	[Views.CursesAddPermissionMode]: "Здесь вы можете переключать слоты для предметов и одежды между режимами «не ограничено», «ограничено» и «заблокировано». Заблокированные средства " +
		"no one can add a curse to it, while limited means only roles that have the permission to curse limited slots can curse them. There " +
		"is no need to save changes as they are instantly in effect.",
	[Views.ConditionsViewRules]: "На этом экране показаны все активные правила для игрока, включая множество информации, такой как продолжительность, " +
		"rule type and little status icons that show if the rule is enforced and/or transgressions are logged. Clicking on the button with the cog icon " +
		"in the middle of each row moves you to a new screen that allows to configure the rule (if you have permission). When the cog icon has a blue " +
		"aura, then that means that the rule's conditions are the same as the global config. If permitted, you can remove single rules with the 'X' button.",
	[Views.ConditionsEditRules]: "Здесь вы включаете/выключаете правило, устанавливаете таймер активации/деактивации/удаления правила и " +
		"define when it can trigger, such as either always or based on where the player is and with whom. The small green/red bars next to the " +
		"checkboxes indicate whether a condition is true at present or not and the big bar whether this means that the rule is in effect, if active. " +
		"Depending on the rule, you can either enforce its effect, " +
		"log all violations, or both at the same time. Lastly on the bottom right, you can set whether the trigger conditions " +
		"of this rule should follow the global rules config or not.",
	[Views.ConditionsGlobalRules]: "Настройки на этой странице являются глобальными настройками/настройками по умолчанию для всех вновь добавленных правил. Изменения в триггере " +
		"conditions are also applied to existing rules that are (still) set to global rules configuration, though. Exception is if a timer is set here. " +
		"Such a timer only applies to newly established rules.",
	[Views.RulesAdd]: "На этом экране вы можете установить новые правила для игрока, просто щелкнув любой шаблон правил. " +
		"After clicking on it, you can edit the rule's configuration. Purple rule templates indicate, that they are already in use; greyed out " +
		"ones, that you have no access to them due to being blocked or due to your permission settings. Rule templates can be limited/blocked " +
		"via the settings button on the very right. Note: If you want to be able to log rule violations, this type of log entry may need to be allowed " +
		"in the configuration page of the behavior log module.",
	[Views.RulesAddPermissionMode]: "Здесь вы можете переключать шаблоны правил между режимами «не ограничено», «ограничено» и «блокировано». Заблокированные средства " +
		"no one can add/use this rule, while limited means only roles that have the permission to establish limited rules can add them. There " +
		"is no need to save changes as they are instantly in effect.",
	[Views.Commands]: "На этом экране вы можете увидеть доступные команды для игрока. " +
		"Clicking on one shows a more detailed description of it. Greyed out commands indicate " +
		"that you have no access to them due to being blocked or due to your permission settings. Commands can be limited/blocked " +
		"via the settings button on the very right. Commands will be used in the chat room's chat by whispering them with a '!' before the command to " +
		"another player. Note: SOME of the commands can also be used on yourself with a leading '.' instead of '!' (e.g. '.eyes close')",
	[Views.CommandsPermissionMode]: "Здесь вы можете переключать команды между «не ограничено», «ограничено» и «заблокировано». Заблокированные средства " +
		"no one can use this command, while limited means only roles that have the permission to use limited commands can trigger them in that chat. There " +
		"is no need to save changes as they are instantly in effect.",
	[Views.Misc]: "This screen offers various settings to configure your Bondage Club experience in general, such as enabling/disabling the " +
		"typing indicator that shows other BCX users an icon when you are currently typing something to public chat or whispering something to " +
		"only them. The cheats are only temporarily active as long as they are set; items that were only given via a cheat are then also gone again.",
	[Views.ExportImportMain]: "Пожалуйста, выберите функцию модуля, которую вы хотите создать резервную копию или импортировать из предыдущего экспорта. После сохранения " +
		"exported texts, you can later on use them again, e.g. for switching between cursed outfits or different rule sets. These exports " +
		"are compatible between different BCX users and can be used by everyone with BCX who is permitted to make changes to the according module. For instance, " +
		"if an owner has the permission to control limited AND non-limited rules on the sub, she is with that also allowed to import previously exported " +
		"rules that are not blocked.",
	[Views.ExportImportSelect]: "Экспорт/импорт работает путем преобразования текущей конфигурации выбранной функции модуля в длинное кодовое слово, которое " +
		"copied to your device's clipboard. You can then paste it anywhere you like, for instance a text file on your device. " +
		"Functionality of this feature depends on the device you are using and if the clipboard can be used on it. " +
		"This field will also show you status information while you try to export or import.\n" +
		"Compressing the export will save you some space when storing it, as the text length will be shorter, although the exported string will no longer be " +
		"human readable. ",
	[Views.Relationships]: "На этом экране вы можете добавлять собственные псевдонимы для других членов клуба. " +
		"The set custom name replaces the added character's real name / BC-nickname in this player's chat, except within chat commands, which are " +
		"considered OOC. You can also enforce the custom name so that the player is blocked from sending a chat message / whisper that use the " +
		"character's name / BC-nickname while with her. The player cannot have multiple custom names set for a single character. A character who " +
		"has a custom name set on this screen can always see their own set custom name in this list.",
};
