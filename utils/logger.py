from colorama import init, Fore, Style
from datetime import datetime
import json

# Inicializar colorama
init()

class PrettyLogger:
    # Emojis para cada tipo de agente/acción
    ICONS = {
        'conv': '🗣️',
        'cag': '🔍',
        'system': '⚙️',
        'error': '❌',
        'success': '✅',
        'prompt': '💭',
        'response': '💡',
        'db': '📚',
        'json': '📋'
    }
    
    @staticmethod
    def _get_timestamp():
        return datetime.now().strftime('%H:%M:%S.%f')[:-3]
    
    @staticmethod
    def _format_json(data):
        return json.dumps(data, indent=2, ensure_ascii=False)
    
    @classmethod
    def conv_agent(cls, action, message):
        print(f"{Fore.CYAN}{cls.ICONS['conv']} [{cls._get_timestamp()}] ConversationalAgent {cls.ICONS[action]}{Style.RESET_ALL}")
        print(f"{Fore.CYAN}└─ {message}{Style.RESET_ALL}\n")
    
    @classmethod
    def cag_agent(cls, action, message):
        print(f"{Fore.MAGENTA}{cls.ICONS['cag']} [{cls._get_timestamp()}] CAGAgent {cls.ICONS[action]}{Style.RESET_ALL}")
        print(f"{Fore.MAGENTA}└─ {message}{Style.RESET_ALL}\n")
    
    @classmethod
    def system(cls, message):
        print(f"{Fore.GREEN}{cls.ICONS['system']} [{cls._get_timestamp()}] System{Style.RESET_ALL}")
        print(f"{Fore.GREEN}└─ {message}{Style.RESET_ALL}\n")
    
    @classmethod
    def error(cls, message):
        print(f"{Fore.RED}{cls.ICONS['error']} [{cls._get_timestamp()}] Error{Style.RESET_ALL}")
        print(f"{Fore.RED}└─ {message}{Style.RESET_ALL}\n")
    
    @classmethod
    def prompt(cls, agent_type, prompt):
        color = Fore.CYAN if agent_type == 'conv' else Fore.MAGENTA
        icon = cls.ICONS['conv'] if agent_type == 'conv' else cls.ICONS['cag']
        print(f"{color}{icon} [{cls._get_timestamp()}] {agent_type.upper()} Prompt {cls.ICONS['prompt']}{Style.RESET_ALL}")
        print(f"{color}└─ {prompt}{Style.RESET_ALL}\n")
    
    @classmethod
    def response(cls, agent_type, response):
        color = Fore.CYAN if agent_type == 'conv' else Fore.MAGENTA
        icon = cls.ICONS['conv'] if agent_type == 'conv' else cls.ICONS['cag']
        print(f"{color}{icon} [{cls._get_timestamp()}] {agent_type.upper()} Response {cls.ICONS['response']}{Style.RESET_ALL}")
        print(f"{color}└─ {response}{Style.RESET_ALL}\n")
    
    @classmethod
    def json_data(cls, agent_type, data):
        color = Fore.CYAN if agent_type == 'conv' else Fore.MAGENTA
        icon = cls.ICONS['conv'] if agent_type == 'conv' else cls.ICONS['cag']
        print(f"{color}{icon} [{cls._get_timestamp()}] {agent_type.upper()} JSON {cls.ICONS['json']}{Style.RESET_ALL}")
        print(f"{color}└─ {cls._format_json(data)}{Style.RESET_ALL}\n") 