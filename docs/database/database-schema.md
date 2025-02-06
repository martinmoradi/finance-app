erDiagram

%% Core user entity at the top
users ||--o{ transactions : "makes"
users ||--o{ budget_categories : "creates"
users ||--o{ saving_pots : "owns"
users ||--o{ recurring_bills : "sets up"

    %% Main entities and their relationships
    transactions }o--|| budget_categories : "belongs to"
    budget_categories ||--o{ recurring_bills : "categorizes"

    %% Junction tables and their relationships
    transactions ||--o{ pot_transactions : "linked to"
    saving_pots ||--o{ pot_transactions : "has"

    recurring_bills ||--o{ bill_payments : "generates"
    transactions ||--o{ bill_payments : "records"

    users {
        uuid id PK
        timestamp created_at
        timestamp updated_at
    }

    transactions {
        uuid id PK
        uuid user_id FK
        uuid category_id FK
        timestamp date
        decimal amount
        text description
        varchar payee
        enum type
        timestamp created_at
        timestamp updated_at
    }

    budget_categories {
        uuid id PK
        uuid user_id FK
        varchar name
        decimal monthly_limit
        timestamp created_at
        timestamp updated_at
    }

    saving_pots {
        uuid id PK
        uuid user_id FK
        varchar name
        decimal target_amount
        decimal current_amount
        timestamp created_at
        timestamp updated_at
    }

    recurring_bills {
        uuid id PK
        uuid user_id FK
        uuid category_id FK
        varchar name
        decimal amount
        integer due_date
        timestamp created_at
        timestamp updated_at
    }

    pot_transactions {
        uuid id PK
        uuid pot_id FK
        uuid transaction_id FK
        decimal amount
        enum type
        timestamp date
    }

    bill_payments {
        uuid id PK
        uuid bill_id FK
        uuid transaction_id FK
        date due_date
        enum status
        timestamp created_at
        timestamp updated_at
    }
